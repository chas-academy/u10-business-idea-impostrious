import React, { Component } from "react";
import { connect } from "react-redux";
import PropTypes from "prop-types";
import io from "socket.io-client";
import { joinedRoom } from "../actions/room";
import GuestFeedback from "../components/GuestFeedback";
import UserVoting from "../components/UserVoting";

class Guest extends Component {
  constructor(props) {
    super(props);
    this.socket = io(`${process.env.REACT_APP_SOCKET_CONNECTION}`);
    this.roomArray = [];

    const {
      match: {
        params: { roomId }
      }
    } = this.props;

    this.roomId = roomId;
  }

  componentDidMount() {
    this.socket.emit("connectToNewSession", {
      roomId: this.roomId,
      role: "guest"
    });

    this.socket.on("joinedRoom", (userId, roomConfig) => {
      const { joinedRoomDispatch } = this.props;
      joinedRoomDispatch(userId, roomConfig);
    });

    window.addEventListener("beforeunload", ev => {
      ev.preventDefault();
      const { sessionUserId } = this.props;
      this.socket.emit("feedbackSessionLeave", {
        inputUserId: sessionUserId,
        roomId: this.roomId
      });
    });
  }

  componentWillUnmount() {
    const { sessionUserId } = this.props;
    this.socket.emit("feedbackSessionLeave", {
      inputUserId: sessionUserId,
      roomId: this.roomId
    });
  }

  render() {
    const {
      match: {
        params: { roomId }
      },
      sessionRoomConfig,
      isConnected
    } = this.props;

    return (
      <div className="d-flex justify-content-center pt-2 container-fluid">
        {roomId !== undefined ? (
          <div
            className="border border-info py-5 shadow-sm"
            style={{ width: "30rem" }}
          >
            <div>
              <h2 className="text-center px-2">
                Welcome To Room: <br /> {roomId.split("-")[1]}
              </h2>

              {isConnected ? (
                <div>
                  <p className="text-center">
                    Pull the slider to get affect the score.
                  </p>
                </div>
              ) : (
                <div>
                  <h3 className="text-center bg-danger">
                    Something went wrong!
                  </h3>
                  <p>
                    Maybe something went wrong on the other side or the link was
                    just plain wrong. Either which way, this room does not
                    exist.
                  </p>
                </div>
              )}
            </div>

            {sessionRoomConfig ? (
              <div>
                <GuestFeedback roomId={roomId} roomConfig={sessionRoomConfig} />
                {sessionRoomConfig[0].params[0].length !== 0 ? (
                  <UserVoting
                    roomId={roomId}
                    votingParams={sessionRoomConfig[0]}
                  />
                ) : null}
              </div>
            ) : null}
          </div>
        ) : (
          <h1 className="jumbotron">URL parameters missing</h1>
        )}
      </div>
    );
  }
}

const mapDispatchToProps = dispatch => ({
  joinedRoomDispatch: (userId, roomConfig) => {
    dispatch(joinedRoom(userId, roomConfig));
  }
});

const mapStateToProps = state => ({
  isConnected: state.room.joined_room,
  sessionUserId: state.room.session_user_id,
  sessionRoomConfig: state.room.session_room_config
});

Guest.propTypes = {
  isConnected: PropTypes.bool,
  sessionUserId: PropTypes.string,
  sessionRoomConfig: PropTypes.array,
  match: PropTypes.object.isRequired,
  joinedRoomDispatch: PropTypes.func.isRequired
};

Guest.defaultProps = {
  isConnected: false,
  sessionUserId: "",
  sessionRoomConfig: {}
};

export default connect(
  mapStateToProps,
  mapDispatchToProps
)(Guest);
