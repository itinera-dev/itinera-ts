@tier-1 @proposal-0009
Feature: The runner fails a scenario whose expectation itinera does not meet

  Scenario: A journey said to fail succeeds
    Given a workflow "orders" with the steps:
      | step   |
      | charge |
    When the workflow runs
    Then the journey failed
