import { DebugReporter, DefaultDispatcherFactory } from "itinera/report";

const dispatcher = new DefaultDispatcherFactory().create();
dispatcher.add(new DebugReporter());
