import React from "react";
import { connect } from "react-redux";
import { Link } from "react-router-dom";
import PropTypes from "prop-types";
import AuthLinks from "./AuthLinks";

// const AuthLinks = () => {
//   return (
//     <div className="navbar-nav">
//       <Link className="nav-item nav-link text-white" to="/">
//         Dashboard
//       </Link>
//       <Link className="nav-item nav-link text-white" to="/my-sessions">
//         My Session
//       </Link>
//       <Link className="nav-item nav-link text-white" to="/new-session">
//         New Session
//       </Link>
//     </div>
//   );
// };

const Links = () => {
  return (
    <div className="navbar-nav">
      <Link className="nav-item nav-link text-white" to="/">
        Home
      </Link>
      <Link className="nav-item nav-link text-white" to="/register">
        Register
      </Link>
      <Link className="nav-item nav-link text-white" to="/login">
        Login
      </Link>
    </div>
  );
};

function Navbar(props) {
  const { auth } = props;
  return (
    <div>
      <nav className="navbar navbar-expand-lg navbar-dark bg-dark">
        <button
          className="navbar-toggler"
          type="button"
          data-toggle="collapse"
          data-target="#navbarNavAltMarkup"
          aria-controls="navbarNavAltMarkup"
          aria-expanded="false"
          aria-label="Toggle navigation"
        >
          <span className="navbar-toggler-icon" />
        </button>
        <div className="collapse navbar-collapse" id="navbarNavAltMarkup">
          <div className="navbar-nav">
            {auth.isAuthenticated ? <AuthLinks /> : <Links />}
          </div>
        </div>
      </nav>
    </div>
  );
}

Navbar.propTypes = {
  auth: PropTypes.object.isRequired
};

const mapStateToProps = state => ({
  auth: state.auth
});

export default connect(mapStateToProps)(Navbar);
