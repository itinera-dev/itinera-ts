/**
 * What cucumber loads before it runs the cases: the sentences, and the
 * world each scenario gets.
 */
import { setWorldConstructor } from "@cucumber/cucumber";
import "./sentences.js";
import { World } from "./world.js";

setWorldConstructor(World);
