import { onlyAllowed, requestsOf } from "../declaration.js";
import { requestsGiven } from "../declaration/marking.js";
import type { Request } from "../declaration/request.js";
import type { Place } from "../declaration/parameter.js";
import type { MethodKey, ParametersOf, Tokens } from "../declaration/token.js";
import { named } from "../name.js";
import type { Provides, RolesOfOne, WorkflowPolicyClass } from "../policy.js";
import {
  type WorkflowPolicyBuilder,
  workflowPolicyGiven,
} from "../policy/workflow-policy/builder.js";
import type { PolicyDescriptor } from "../policy/descriptor.js";
import type { ReporterClass } from "../report.js";
import type { Provided, ProviderOptions, ServiceType } from "../service.js";
import {
  declaredProvider,
  type DeclaredProvider,
  providerRequests,
} from "../service/provider.js";
import type { StepBuilder, StepClass, StepDescriptor } from "../step.js";
import { describedBy } from "../step/builder.js";
import type { Built, Workflow, WorkflowName } from "../workflow.js";
import {
  adapterRequests,
  declaredAdapter,
  type DeclaredAdapter,
  type InputAdapterOptions,
  type Supplied,
} from "./adapter.js";
import { assemble, type WorkflowDescriptor } from "./descriptor.js";
import type { IdGeneratorKey } from "./id-generator.js";
import type { ListedStep } from "./listing.js";
import type { Declaration, IdGenerator } from "./registry.js";

/**
 * Puts a workflow together, starting from what the decorators of its class
 * `C` declared, and makes its workflow object. `Orders.builder()` makes one.
 *
 * Each method adds to what the workflow will have and returns the builder.
 * `build()` checks the whole workflow, then calls the constructor of `C`
 * with the arguments `constructWith` was given. `Ready` says whether those
 * arguments are known: `build()` does not compile until they are, unless
 * the constructor takes none.
 *
 * {@includeCode ../../examples/builder.ts}
 */
export class WorkflowBuilder<
  C extends new (...args: never[]) => Workflow,
  Ready extends boolean = [] extends ConstructorParameters<C> ? true : false,
> {
  declare private readonly ready: Ready;
  readonly #workflow: C;
  #name: WorkflowName | undefined;
  readonly #steps: StepDescriptor[];
  readonly #reporters: ReporterClass[];
  readonly #policies: PolicyDescriptor[];
  readonly #adapters: DeclaredAdapter[];
  readonly #providers: DeclaredProvider[];
  #idGenerator: IdGenerator | undefined;
  #args: ConstructorParameters<C> | undefined;
  readonly #attach: Attach;

  /**
   * Starts from what the decorators of `workflow` declared, and gives each
   * workflow object it builds its descriptor through `attach`.
   */
  constructor(workflow: C, declared: Declaration, attach: Attach) {
    this.#workflow = workflow;
    this.#attach = attach;
    this.#name = declared.name;
    this.#steps = [...declared.steps];
    this.#reporters = [...declared.reporters];
    this.#policies = [...declared.policies];
    this.#adapters = [...declared.adapters];
    this.#providers = [...declared.providers];
    this.#idGenerator = declared.idGenerator;
  }

  /**
   * Names the workflow, in place of the name `@workflow` gave it.
   *
   * @throws Error if the name is empty.
   */
  name(name: string): this {
    this.#name = named<WorkflowName>(
      name,
      `workflow class ${this.#workflow.name}`,
    );
    return this;
  }

  /**
   * Adds a step after the steps the workflow has so far, as its builder has
   * put it together so far: a class extending `Step`, declared with `@step`
   * or not, started with `Charge.builder("charge")`. It compiles only when
   * the workflow class implements every role the step's policies request.
   *
   * @throws Error if a parameter of the step's constructor or of its `run`
   * has no request.
   */
  step<S extends StepClass, R>(
    step: StepBuilder<S, R> & Provides<InstanceType<C>, R>,
  ): this {
    this.#steps.push(describedBy(step));
    return this;
  }

  /**
   * Attaches a workflow policy, after those attached so far: a class
   * declared with `@workflowPolicy`, or a policy's builder. It compiles only
   * when the workflow class implements every role the policy requests.
   *
   * {@includeCode ../../examples/policy-builder.ts}
   *
   * @throws Error if the class is not declared with `@workflowPolicy`, or if
   * the policy's builder was given no hook.
   */
  policy<P extends WorkflowPolicyClass>(
    policy: (P | WorkflowPolicyBuilder<P>) &
      Provides<InstanceType<C>, RolesOfOne<P>>,
  ): this {
    this.#policies.push(workflowPolicyGiven(policy));
    return this;
  }

  /**
   * Makes the method `key` of the workflow class an input adapter, as
   * `options` say, after those the workflow has so far, its parameters
   * making `requests`, in order, as `@inputAdapter` does for a method it
   * marks.
   *
   * {@includeCode ../../examples/tokens-by-position.ts}
   *
   * @throws Error if `key` names a field rather than a method of the class,
   * if the name is empty, if the method declares its requests with
   * decorators, if a parameter is left without a request, or if one makes a
   * request an input adapter may not make.
   */
  inputAdapter<K extends MethodKey<InstanceType<C>, Supplied>>(
    key: K,
    options: InputAdapterOptions,
    ...requests: Tokens<
      ParametersOf<InstanceType<C>, K>,
      Place<InstanceType<C>, K>
    >
  ): this {
    this.#requireMethod(key);
    this.#adapters.push(
      declaredAdapter(this.#workflow, key, options, () =>
        this.#given(key, requests, adapterRequests, "an input adapter"),
      ),
    );
    return this;
  }

  /**
   * Makes the method `key` of the workflow class a service provider of the
   * service type `type`, as `options` say, after those the workflow has so
   * far, its parameters making `requests`, in order, as `@provider` does for
   * a method it marks.
   *
   * {@includeCode ../../examples/tokens-by-position.ts}
   *
   * @throws Error if `key` names a field rather than a method of the class,
   * if its name or its key is empty, if the method declares its requests
   * with decorators, if a parameter is left without a request, or if one
   * makes a request a service provider may not make.
   */
  provider<T, K extends MethodKey<InstanceType<C>, Provided<T>>>(
    key: K,
    type: ServiceType<T>,
    options: ProviderOptions,
    ...requests: Tokens<
      ParametersOf<InstanceType<C>, K>,
      Place<InstanceType<C>, K>
    >
  ): this {
    this.#requireMethod(key);
    this.#providers.push(
      declaredProvider(this.#workflow, key, type, options, () =>
        this.#given(key, requests, providerRequests, "a service provider"),
      ),
    );
    return this;
  }

  /** Adds a class of reporters, after those the workflow lists so far. */
  reporter(reporter: ReporterClass): this {
    this.#reporters.push(reporter);
    return this;
  }

  /**
   * Makes the method `key` of the workflow class its ID generator, called
   * with the workflow object as `this` to make each instance's journey ID.
   *
   * @throws Error if the workflow has an ID generator already, if `key`
   * names a field rather than a method of the class, or if a parameter of the
   * method has no request.
   */
  idGenerator(key: IdGeneratorKey<InstanceType<C>>): this {
    if (this.#idGenerator !== undefined) {
      throw new Error(`${this.#workflow.name} has more than one ID generator`);
    }
    this.#requireMethod(key);
    requestsOf(this.#workflow, key);
    const generate: unknown = Reflect.get(
      this.#workflow.prototype as Workflow,
      key,
    );
    this.#idGenerator = generate as IdGenerator;
    return this;
  }

  /**
   * Keeps the arguments the workflow class's constructor is called with when
   * the workflow is built.
   */
  constructWith(...args: ConstructorParameters<C>): WorkflowBuilder<C, true> {
    this.#args = args;
    return this as WorkflowBuilder<C, true>;
  }

  /**
   * Checks the whole workflow, then makes its workflow object, calling the
   * constructor with the arguments `constructWith` was given, and gives it
   * its new workflow descriptor.
   *
   * @throws Violations listing every violation in how the workflow is put
   * together, before the constructor runs.
   * @throws Error if the workflow has no name.
   */
  build(this: WorkflowBuilder<C, true>): Built<InstanceType<C>> {
    const descriptor = this.#assemble();
    const made = new this.#workflow(...(this.#args ?? []));
    this.#attach(made, descriptor);
    return made as Built<InstanceType<C>>;
  }

  /**
   * Lists the steps the workflow has so far, in order, without running
   * anything and without a workflow object, as the workflow descriptor
   * `build()` would make lists them.
   *
   * {@includeCode ../../examples/listing.ts}
   *
   * @throws Violations listing every violation in how the workflow is put
   * together so far.
   * @throws Error if the workflow has no name.
   */
  listing(): readonly ListedStep[] {
    return this.#assemble().listing();
  }

  #assemble(): WorkflowDescriptor {
    return assemble(
      {
        name: this.#name,
        steps: this.#steps,
        reporters: this.#reporters,
        policies: this.#policies,
        adapters: this.#adapters,
        providers: this.#providers,
        idGenerator: this.#idGenerator,
      },
      this.#workflow.name,
    );
  }

  #requireMethod(key: string | symbol): void {
    const method: unknown = Reflect.get(
      this.#workflow.prototype as Workflow,
      key,
    );
    if (typeof method !== "function") {
      throw new Error(
        `${this.#workflow.name}.${String(key)} is not a method of the class`,
      );
    }
  }

  #given(
    key: string | symbol,
    given: readonly unknown[],
    allowed: readonly Request["kind"][],
    what: string,
  ): readonly Request[] {
    return onlyAllowed(
      requestsGiven(this.#workflow, key, given),
      this.#workflow,
      key,
      allowed,
      what,
    );
  }
}

/** Gives a workflow object its checked descriptor, as `build()` does. */
type Attach = (workflow: Workflow, descriptor: WorkflowDescriptor) => void;
