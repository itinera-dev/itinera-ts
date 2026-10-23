@tier-1
Feature: The runner runs the scenarios the tag expression selects

  @proposal-0002
  Scenario: A selected scenario
    Given the data bag is empty

  @proposal-0008
  Scenario: A scenario of another proposal
    Given the data bag is empty

  @proposal-0002 @non-value
  Scenario: A scenario excluded by a tag
    Given the data bag is empty
