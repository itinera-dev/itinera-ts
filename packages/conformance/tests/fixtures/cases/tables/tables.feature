@tier-1 @proposal-0010
Feature: The runner reads the columns of the tables that the tier 1 cases leave out

  Scenario: The hooks received table checks the step name, the error and an absent failure reason
    Given the step policies and their hooks:
      | policy | hook          |
      | watch  | on step retry |
    Given the hooks request:
      | policy | hook          | request        | optional |
      | watch  | on step retry | step name      |          |
      | watch  | on step retry | error          |          |
      | watch  | on step retry | failure reason | yes      |
      | watch  | on step retry | retry cause    |          |
    Given a workflow "orders" with the steps:
      | step   | policies |
      | charge | watch    |
    And step "charge" allows 1 retries
    And step "charge" attempts:
      | attempt | outcome | message |
      | 1       | error   | timeout |
      | 2       | success |         |
    When the workflow runs
    Then the hooks received:
      | policy | hook          | calls | step name | error   | failure reason | cause                |
      | watch  | on step retry | 1     | charge    | timeout | none           | abnormal termination |

  Scenario: The steps table scripts a failure, and an absent input is checked by the built table
    Given a workflow "orders" with the steps:
      | step   | outcome | code     |
      | charge | failure | declined |
    And step "charge" requests optional input "coupon" of type string
    When the workflow runs
    Then the steps were built with:
      | step   | input  | value  |
      | charge | coupon | absent |
    And the steps ended as:
      | step   | status | attempts |
      | charge | failed | 1        |
