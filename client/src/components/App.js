import React from "react";
import { Provider } from "react-redux";
import { BrowserRouter as Router, Route, Switch } from "react-router-dom";

// Redux store
import store from "../stores";

// Components
import Navbar from "./Layout/Navbar";
import PrivateRoute from "./PrivateRoute";

// Pages
import { Landing, Register, Login, Dashboard } from "../pages";
import MySessions from "../pages/MySessions";
import NewSession from "../pages/NewSession";

const App = () => (
  <Provider store={store}>
    <Router>
      <>
        <Navbar />
        <Route exact path="/" component={Landing} />
        <Route exact path="/register" component={Register} />
        <Route exact path="/login" component={Login} />
        <Switch>
          <PrivateRoute exact path="/dashboard" component={Dashboard} />
          <PrivateRoute exact path="/my-sessions" component={MySessions} />
          <PrivateRoute exact path="/new-session" component={NewSession} />
        </Switch>
      </>
    </Router>
  </Provider>
);

export default App;
