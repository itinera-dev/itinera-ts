@tier-1 @proposal-0009
Feature: The runner runs journeys and checks what they did

  Scenario: A journey whose steps succeed is read from the runner's recorder
    Given a workflow "orders" with the steps:
      | step   |
      | charge |
      | ship   |
    And the data bag contains:
      | key   | value |
      | order | "A-1" |
    And the workflow's ID generator returns "order-7"
    And step "charge" succeeds
    And step "ship" is asynchronous
    When the workflow runs
    Then the journey succeeded
    And run returned a result instead of throwing
    And the journey ID is "order-7"
    And the result's journey ID is "order-7"
    And the journey_started event lists the initial keys "order" without their values
    And no engine event carries the value of "order"
    And every event carries the journey ID "order-7" and the workflow name "orders", with increasing sequence numbers
    And step "charge" ended as succeeded after 1 attempts
    And step "ship" was built 1 times, each time as a new instance
    And the result's data bag has no key "receipt"
    And the last event is "journey_succeeded"
    And the events are exactly:
      | event             | step   | attempt | decided by |
      | journey_started   |        |         |            |
      | attempt_started   | charge | 1       |            |
      | step_succeeded    | charge | 1       |            |
      | attempt_started   | ship   | 1       |            |
      | step_succeeded    | ship   | 1       |            |
      | journey_succeeded |        |         | default    |

  Scenario: An abnormal termination is retried, then fails the journey with its error
    Given a workflow "orders" with the steps:
      | step   |
      | charge |
      | ship   |
    And the workflow has no ID generator
    And step "charge" allows 1 retries
    And step "charge" attempts:
      | attempt | outcome | message |
      | 1       | error   | timeout |
      | 2       | error   | down    |
    When the workflow runs
    Then the journey failed
    And the journey ID is a UUID v4
    And the result's failure has the cause "retries exhausted"
    And the result's failure carries the error "down"
    And the result's failure carries no reason
    And step "charge" ended as failed after 2 attempts
    And step "ship" ended as not executed after 0 attempts
    And step "charge" was built 2 times, each time as a new instance
    And the events include, in order:
      | event                     | step   | attempt | cause                | error |
      | step_abnormal_termination | charge | 1       |                      |       |
      | step_retrying             | charge | 1       | abnormal termination |       |
      | step_given_up             | charge | 2       | retries exhausted    |       |
      | journey_failed            | charge |         | retries exhausted    | down  |

  Scenario: A reporter that fails aborts the journey, read from the reporters the workflow lists
    Given a workflow "orders" with the steps:
      | step   |
      | charge |
    And the workflow lists the reporters "metrics", "audit"
    And the reporter "audit" fails with "disk full" on "step_succeeded"
    And the executor uses its default dispatcher
    And step "charge" succeeds
    When the workflow runs
    Then the journey was aborted with the abort reason "reporter failed"
    And the result names the step "charge" as where the journey was aborted, with the abort reason "reporter failed"
    And the result's abort carries the error "disk full"
    And the result carries no data bag
    And step "charge" ended as succeeded after 1 attempts
    And the reporter "audit" received the event "step_succeeded"
    And the reporter "audit" did not receive the event "journey_aborted"
    And the reporter "metrics" received the event "journey_aborted" 1 times
    And no event carries the message "out of paper"
    And the events are exactly:
      | event           | step   | code            | error     |
      | journey_started |        |                 |           |
      | attempt_started | charge |                 |           |
      | step_succeeded  | charge |                 |           |
      | journey_aborted | charge | reporter failed | disk full |

  Scenario: A step that cannot be built aborts the journey
    Given a workflow "orders" with the steps:
      | step   |
      | charge |
    And step "charge" cannot be built because its constructor fails with "no connection"
    When the workflow runs
    Then the journey was aborted
    And step "charge" ended as aborted after 1 attempts
    And step "charge" ended as aborted
    And journey_aborted names no adapter
    And step "charge" was built 0 times, each time as a new instance

  Scenario: Initial data that is not a value is refused, with no event
    Given a workflow "orders" with the steps:
      | step   |
      | charge |
    And the workflow lists the reporters "audit"
    And the data bag contains a non-value as "callback"
    When the workflow runs
    Then run was refused with the message "callback"
    And no event was emitted
    And no step ran
    And the reporter "audit" received no event

  Scenario: Two journeys of one executor are read apart
    Given a workflow "orders" with the steps:
      | step   |
      | charge |
    And the workflow lists the reporters "audit", "metrics"
    And the executor is given a dispatcher holding the reporter "held"
    When the same executor runs the workflow twice, with a new instance each time
    Then the two journeys have different journey IDs
    And the second journey's events are the first journey's events, apart from the journey ID and timestamps
    And each instance's reporter "audit" received only its own journey's events
    And the reporters "audit", "metrics" received the same events

  Scenario: A workflow the builder refuses produces no journey
    Given a workflow "orders" with the steps:
      | step   |
      | charge |
      | charge |
    When the workflow is admitted
    Then admission is refused with the violations:
      | violation           |
      | duplicate step name |
    And no journey ID was produced
