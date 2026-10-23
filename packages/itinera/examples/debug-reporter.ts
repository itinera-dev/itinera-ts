import { DebugReporter, DefaultDispatcherFactory } from "itinera/unstable";

const dispatcher = new DefaultDispatcherFactory().create();
dispatcher.add(new DebugReporter());
