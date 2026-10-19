@tier-1 @proposal-0008
Feature: The runner plays what a step does before it ends, and how it ends

  Scenario: A step contributes, reports and sets global metadata before it succeeds
    Given a workflow "orders" with the steps:
      | step   |
      | charge |
    And step "charge" emits step_info "charging" with data {"amount": 40}
    And step "charge" sets the global metadata "user_id" to "u-7"
    And step "charge" contributes "receipt" = "R-1"
    And step "charge" succeeds
    And the workflow's ID generator returns "order-42"
    And the workflow lists the reporters "audit"
    And the executor uses its default dispatcher
    When the workflow runs
    Then the journey succeeded
    And the result's data bag contains:
      | key     | value |
      | receipt | "R-1" |
    And the reporter "audit" received the global metadata:
      | key        | value      | after           |
      | journey_id | "order-42" | none            |
      | user_id    | "u-7"      | step_info       |
    And no engine event carries the value of "receipt"
    And no engine event carries the global metadata value of "user_id"

  Scenario: A step that is skipped or fails commits nothing it contributed
    Given a workflow "orders" with the steps:
      | step   |
      | ship   |
      | charge |
    And step "ship" contributes "tracking" = "T-9"
    And step "ship" attempts:
      | attempt | outcome |
      | 1       | skipped |
    And step "charge" contributes "receipt" = "R-1"
    And step "charge" attempts:
      | attempt | outcome | code     |
      | 1       | failure | declined |
    When the workflow runs
    Then the journey failed
    And the events include, in order:
      | event          | step   | attempt |
      | step_skipped   | ship   | 1       |
      | step_failed    | charge | 1       |
      | journey_failed | charge |         |
    And no contribution of "tracking" was committed
    And no contribution of "receipt" was committed
