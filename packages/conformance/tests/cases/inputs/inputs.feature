@tier-1 @proposal-0060
Feature: The runner builds steps with their inputs and plays input adapters

  Scenario: A step is built with its inputs, from the data bag or from its input adapter
    Given a workflow "orders" with the steps:
      | step   |
      | charge |
      | ship   |
    And step "charge" requests input "amount" of type integer
    And step "charge" requests optional input "discount" of type integer
    And step "charge" requests input "currency" of type string
    And step "charge" succeeds
    And step "ship" requests input "lines" of type list
    And step "ship" succeeds
    And the data bag contains:
      | key      | value    |
      | amount   | 42       |
      | currency | "EUR"    |
      | lines    | ["A-1"]  |
      | price    | 7        |
    And the workflow declares the input adapter "pricing" for the steps "charge"
    And the input adapter "pricing" requests the data bag
    And the input adapter "pricing" returns "price" of type integer, read from the data bag, for "amount"
    And the input adapter "pricing" returns nothing for "currency"
    When the workflow runs
    Then step "charge" was built with input "amount" = 7
    And step "charge" was built with input "discount" absent
    And step "charge" was built for attempt 1 with input "currency" = "EUR"
    And step "ship" was built with input "lines" = ["A-1"]
    And the result's data bag contains:
      | key    | value |
      | amount | 42    |
    And the events include, in order:
      | event                  | step   | key      | adapter |
      | input_adapter_supplied | charge | amount   | pricing |
      | optional_input_absent  | charge | discount |         |

  Scenario: An input adapter that fails aborts the journey
    Given a workflow "orders" with the steps:
      | step   |
      | charge |
    And step "charge" requests input "amount" of type integer
    And step "charge" succeeds
    And the workflow declares the input adapter "pricing" for the steps "charge"
    And the input adapter "pricing" requests the step name and returns it for "currency"
    And the input adapter "pricing" fails with "price list unavailable" for "amount"
    When the workflow runs
    Then no step ran
    And the events include, in order:
      | event                | step   | key    | adapter |
      | input_adapter_failed | charge | amount | pricing |
    And the journey was aborted with the abort reason "step could not be built"
