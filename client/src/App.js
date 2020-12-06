import React from "react";
import { BrowserRouter, Route, Switch } from "react-router-dom";
import CreateRoom from "./routes/create_room";
import Room from "./routes/room";
import "./App.css";

function App() {
  return (
    <div className="App">
      <BrowserRouter>
        <Switch>
          <Route path="/" exact component={CreateRoom} />
          <Route path="/room" component={Room} />
        </Switch>
      </BrowserRouter>
      <div>&copy; Ashish Bisht</div>
    </div>
  );
}

export default App;
