@tier-1 @proposal-0060
Feature: The runner fails a scenario that defines an input adapter the workflow never binds

  Scenario: An input adapter defined and never bound
    Given the input adapter "pricing" returns 42 when step "charge" requests "amount"
    Given a workflow "orders" with the steps:
      | step   | inputs          | outcome |
      | charge | amount: integer | success |
    When the workflow runs
