import React from "react";
import { Provider } from "react-redux";
import { BrowserRouter as Router, Route, Switch } from "react-router-dom";

// Redux store
import store from "../stores";

// Components
import Navbar from "./Layout/Navbar";
import PrivateRoute from "./PrivateRoute";
import PublicRoute from "./PublicRoute";

// Pages
import { Landing, Register, Login, Dashboard } from "../pages";

const App = () => (
  <Provider store={store}>
    <Router>
      <>
        <Navbar />

        <Route exact path="/register" component={Register} />
        <Route exact path="/login" component={Login} />
        <Switch>
          <PublicRoute exact path="/" component={Landing} />
        </Switch>
        <Switch>
          <PrivateRoute exact path="/dashboard" component={Dashboard} />
        </Switch>
      </>
    </Router>
  </Provider>
);

export default App;
