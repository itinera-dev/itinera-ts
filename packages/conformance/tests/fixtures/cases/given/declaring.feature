@tier-1 @proposal-0002
Feature: The runner reads every sentence that only declares

  Scenario: The sentences about a workflow's steps fill the scenario model
    Given a workflow "orders" with the steps:
      | step   |
      | charge |
      | ship   |
      | notify |
    And step "charge" requests input "amount" of type integer
    And step "charge" requests optional input "coupon" of type string
    And step "charge" contributes "receipt" = {"paid": true}
    And step "charge" contributes "tags" = ["a"] and then changes it to ["b"]
    And step "charge" contributes a non-value as "callback"
    And step "charge" changes its input "amount" to 11
    And step "charge" emits step_info "charging"
    And step "charge" emits step_warning "slow" with data {"ms": 900}
    And step "charge" emits step_error "broken" with data that is not a value
    And step "charge" sets the global metadata "tenant" to "acme"
    And step "charge" sets the global metadata "callback" to a non-value
    And step "charge" attempts:
      | attempt | outcome | code     |
      | 1       | failure | declined |
      | 2       | success |          |
    And step "charge" allows 1 retries
    And step "charge" does not retry abnormal terminations
    And step "charge" ignores failures of its emit calls and carries on
    And step "charge" keeps its contributor and step reporter
    And step "charge" has a rescue step
    And step "charge_rescue" requests rescued step data "receipt" of type object
    And step "charge_rescue" requests optional rescued step data "tags" of type list
    And step "charge_rescue" requests the failure reason
    And step "charge_rescue" requests the error
    And step "ship" succeeds
    And step "ship" is asynchronous
    And step "notify" cannot be built because its constructor fails with "no address"
    And step "notify" fails with code "unreachable" and details that are not a value

  Scenario: The sentences about data, journey IDs and reporters fill the scenario model
    Given a workflow "orders" with the steps:
      | step   |
      | charge |
    And the data bag is empty
    And the workflow's ID generator returns "journey-7"
    And the workflow lists the reporters "audit", "metrics", "ledger", "tracer"
    And the reporter "audit" throws
    And the reporter "metrics" throws on "step_failed"
    And the reporter "ledger" fails with "disk full" on "journey_started"
    And the reporter "tracer" fails when it receives the global metadata "tenant"
    And the workflow instance is created with the global metadata:
      | key    | value  |
      | tenant | "acme" |
    And the workflow instance is created with a non-value as global metadata "callback"
    And the executor is given a dispatcher holding the reporter "held"

  Scenario: The sentences about initial data fill the scenario model
    Given a workflow "orders" with the steps:
      | step   |
      | charge |
    And the data bag contains:
      | key    | value |
      | amount | 10    |
    And the data bag contains a non-value as "callback"
    And the workflow has no ID generator
    And the executor uses its default dispatcher

  Scenario Outline: The sentences about dispatchers fill the scenario model
    Given a workflow "orders" with the steps:
      | step   |
      | charge |
    And the executor is given <dispatcher>

    Examples:
      | dispatcher                                                                              |
      | a dispatcher factory that fails                                                         |
      | a dispatcher holding the reporter "held" that ignores added reporters                   |
      | a dispatcher holding the reporter "held" that throws when a reporter is added           |
      | a dispatcher holding the reporter "held" that throws when dispatching "journey_started" |
