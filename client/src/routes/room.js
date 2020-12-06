import React, { useRef, useEffect, useState } from "react";
import io from "socket.io-client";
import "./room.css";

const Room = (props) => {
  /* 
  useRef is similar as Sate hoods that store the previous value but 
  it does not re render the component again because it is completely separate from our component lifecycle.
  
  useRef returns a mutable ref object whose .current property is initialized to the passed argument (initialValue). 
  The returned object will persist for the full lifetime of the component.
    

  If you pass a ref object to React with <div ref={myRef} />, React will set its .current property to the corresponding DOM node whenever that node changes.


  function TextInputWithFocusButton() {
  const inputEl = useRef(null);
  const onButtonClick = () => {
    // `current` points to the mounted text input element
    inputEl.current.focus();
  };
  return (
    <>
      <input ref={inputEl} type="text" />
      <button onClick={onButtonClick}>Focus the input</button>
    </>
  );
}

This function will focus the input field on click on the Btn

  */
  const userVideo = useRef();
  const socketRef = useRef();
  //const otherUser = useRef();
  const userStream = useRef();

  const [ParticipantsCount, updateCount] = useState(1);

  const otherUsers = useRef({});
  const AboutMe = useRef({});
  let config = {
    iceServers: [
      {
        urls: "stun:stun.stunprotocol.org",
      },
      {
        urls: "turn:numb.viagenie.ca",
        credential: "muazkh",
        username: "webrtc@live.com",
      },
    ],
  };

  /*UseEffect react hook is use to perform the additional side effect whenever a component renders.
  The function passed to useEffect will run after the render is committed to the screen
  By default, effects run after every completed render every time our application renders, but you can choose to fire them only when certain values have changed.
  To implement this, pass a second argument to useEffect that is the array of values that the effect depends on. 
  useEffect(()=>{method definition to perform   return()=>{A return function to clean up the things when we unmount  to clean the things for new mount/new task whatever we did last time} },[array of values that this Effect hook will depend upon  ])

  Giving it an empty array acts like componentDidMount as in, it only runs once.

Giving it no second argument acts as both componentDidMount and componentDidUpdate, as in it runs first on mount and then on every re-render.

Giving it an array as second argument with any value inside, eg , [variable1] will only execute the code inside your useEffect hook ONCE on mount, as well as whenever that particular variable (variable1) changes.

  */

  useEffect(() => {
    //const data = props.location; //here data is received from create_room page

    socketRef.current = io.connect("/");

    socketRef.current.on("AboutMe", (MineData) => {
      AboutMe.current = {
        UserName: MineData.Name,
        userID: MineData.ID,
        Room: MineData.Room,
        Media_Constraints: MineData.Media_const,
      };
      socketRef.current.emit("join_room", AboutMe.current.Room);
      document.getElementById("RoomBody").value = AboutMe.current.Room;
      StartMedia();
    });

    function StartMedia() {
      navigator.mediaDevices
        .getUserMedia(AboutMe.current.Media_Constraints)
        .then((stream) => {
          userVideo.current.srcObject = stream;
          userStream.current = stream;
          document
            .getElementById("localVideoContainer")
            .appendChild(makeLabel(AboutMe.current.UserName, " (You)"));
        });
    }

    //whenever a new user joins the  room
    socketRef.current.on("user_joined", (user) => {
      makePeer(user);
      document.getElementById(
        "ClientRemovedMsg"
      ).textContent = `${user.UserName} Joined the Room.`;
      socketRef.current.emit("to_other_socket", {
        dest: user.userID,
        LocalInfo: {
          UserName: AboutMe.current.UserName,
          userID: AboutMe.current.userID,
          Room: AboutMe.current.Room,
        },
      });
    });

    socketRef.current.on("user_disconnected", (userid) => {
      document.getElementById(
        "ClientRemovedMsg"
      ).innerHTML = `${otherUsers.current[userid].name} left the Room.`;
      removeClient(userid);
    });

    socketRef.current.on("callerSocket", (contact) => {
      makePeer(contact, true);
    });

    socketRef.current.on("ice-candidate", handleNewICECandidateMsg);

    socketRef.current.on("Answer", handleAnswer);

    socketRef.current.on("redirect_to_home_URL", (url) => {
      alert(
        "\n!! Invalid/Unauthorized Routing. Redirecting to home route...!\n"
      );
      window.location.href = url;
    });
  }, []); //Empty dependency array means It will execute only once (on mount)

  function makePeer(user_info, initiate_call = false) {
    otherUsers.current[user_info.userID] = {
      name: user_info.UserName,
      peer: new RTCPeerConnection(config),
    };

    otherUsers.current[user_info.userID].peer.onicecandidate = (event) =>
      handleICECandidateEvent(event, user_info.userID);
    otherUsers.current[user_info.userID].peer.ontrack = (event) => {
      handleTrackEvent(event, user_info);
    };
    otherUsers.current[user_info.userID].peer.oniceconnectionstatechange = (
      event
    ) => checkPeerDisconnect(event, user_info.userID);
    otherUsers.current[user_info.userID].peer.addStream(userStream.current);
    if (initiate_call) {
      otherUsers.current[user_info.userID].peer
        .createOffer()
        .then((description) => createDescription(description, user_info.userID))
        .catch((e) => {
          console.log("\nError in create Description : \n" + e);
        });
    }
  }

  function handleICECandidateEvent(event, userID) {
    if (event.candidate) {
      socketRef.current.emit("ice-candidate", {
        dest: userID,
        Info: { ice: event.candidate, userID: AboutMe.current.userID },
      });
    }
  }

  function handleNewICECandidateMsg(incoming) {
    otherUsers.current[incoming.userID].peer
      .addIceCandidate(new RTCIceCandidate(incoming.ice))
      .catch((e) => {
        console.log("\nError in addICECandidate" + e);
      });
  }

  async function createDescription(description, userID) {
    console.log(`\n!! Create description, peer ${userID}`);

    otherUsers.current[userID].peer
      .setLocalDescription(description)
      .then(function () {
        console.log("\n!! Sending Offer\n");
        socketRef.current.emit("offer", {
          dest: userID,
          Info: {
            //userID: AboutMe.current[`userID`],
            userID: AboutMe.current.userID,
            sdp: otherUsers.current[userID].peer.localDescription,
          },
        });
      })
      .catch((e) => {
        console.log("\n!! Error in create Description :" + e);
      });
  }

  function handleAnswer(data) {
    otherUsers.current[data.userID].peer
      .setRemoteDescription(new RTCSessionDescription(data.sdp))
      .then(function () {
        /*
        Only create answers in response to offers
        If case is for only for the time when some other client is calling and sending their offer 

        else 
        when offer is received from this user that was send by caller now this user will send its answer (SDP).
        for the caller it will be not offer now call has be answered and now caller can simply connect to it 
        */
        if (data.sdp.type === "offer") {
          otherUsers.current[data.userID].peer
            .createAnswer()
            .then((description) => createDescription(description, data.userID))
            .catch((e) => {
              console.log("\nError in Answering for Received Call :" + e);
            });
        }
      })
      .catch((e) => {
        console.log("Error in Setting Remote Description" + e);
      });
  }

  function handleTrackEvent(e, user) {
    let id = document.getElementById(user.userID);
    if (id) {
      id.srcObject = e.streams[0];
    } else {
      let incoming = document.createElement("video");
      incoming.setAttribute("autoplay", "");
      incoming.id = user.userID;
      incoming.srcObject = e.streams[0];

      var vidContainer = document.createElement("div");
      vidContainer.setAttribute("id", "remoteVideo_" + user.userID);
      vidContainer.setAttribute("class", "videoContainer_remote");
      vidContainer.appendChild(incoming);
      vidContainer.appendChild(makeLabel(user.UserName));

      document.getElementById("video_streams").appendChild(vidContainer);

      updateLayout();
    }
  }

  function checkPeerDisconnect(event, userID) {
    if (otherUsers.current[userID]) {
      //If userid of the Left user is still in the client array then this block will remove it
      var state = otherUsers.current[userID].peer.iceConnectionState;
      console.log(`\n!! connection with peer ${userID} ${state}`);
      if (
        state === "failed" ||
        state === "closed" ||
        state === "disconnected"
      ) {
        console.log(`\n${otherUsers.current[userID].name} Peer Disconnection`);
        removeClient(userID);
      }
    }
  }

  function removeClient(userid) {
    if (otherUsers.current[userid]) {
      delete otherUsers.current[userid];
      try {
        document
          .getElementById("video_streams")
          .removeChild(document.getElementById("remoteVideo_" + userid));
        updateLayout();
      } catch (err) {
        console.log("\nError while Removing Client. \n");
        return;
      }
    }
  }
  function makeLabel(label, extraString = "") {
    var vidLabel = document.createElement("div");
    vidLabel.textContent = label + extraString;
    // vidLabel.appendChild(document.createTextNode(label+extraString));
    vidLabel.setAttribute("class", "videoLabel");
    return vidLabel;
  }

  function updateLayout() {
    // update CSS grid based on number of displayed videos
    var rowHeight = "98vh";
    var colWidth = "100%";

    var numVideos = document.getElementsByTagName("video").length; // add one to include local video

    if (numVideos > 1 && numVideos <= 4) {
      // 2x2 grid
      rowHeight = "38vh";
      colWidth = "38vw";
    } else if (numVideos > 4) {
      // 3x3 grid
      rowHeight = "30vh";
      colWidth = "30vw";
    }

    document.documentElement.style.setProperty(`--rowHeight`, rowHeight);
    document.documentElement.style.setProperty(`--colWidth`, colWidth);

    updateCount(Object.keys(otherUsers.current).length + 1); //otherUsers.current contains the peer of other client in the room "+1" is for the count of own peer connection
  }
  function LeaveMeeting() {
    let others = Object.keys(otherUsers.current);
    console.log(others);
    others.forEach((id) => {
      otherUsers.current[id].peer.close();
      delete otherUsers.current[id];

      document
        .getElementById("video_streams")
        .removeChild(document.getElementById("remoteVideo_" + id));
    });
    updateLayout();
    props.history.push({
      pathname: "/",
    });
    window.location.reload();
  }

  return (
    <div
      style={{
        backgroundColor: "#131c21",
        width: "100%",
        height: "auto",
        textAlign: "center",
        boxSizing: "border-box",
        padding: "4px",
        margin: "0px",
      }}
    >
      <div
        id="RoomHeader"
        style={{
          textAlign: "Left",
          boxSizing: "border-box",
          padding: "2px 8px",
          display: "inline-block",
          width: "100%",
          margin: "0px",
        }}
      >
        <div style={{ float: "left", boxSizing: "border-box", margin: "0px" }}>
          <button id="RoomTag" style={{ margin: "0px" }}>
            Room
          </button>

          <input
            style={{
              border: "2px solid black",
              borderRadius: "6px",
              textAlign: "left",
              width: "100px",
              height: "20px",
              padding: "3px",
              overflow: "hidden",
            }}
            id="RoomBody"
            type="text"
            readOnly
          ></input>
        </div>
        <div
          style={{
            boxSizing: "border-box",
            float: "right",
            padding: "5px",
            margin: "0px",
          }}
        >
          Number of Participants : {ParticipantsCount}
        </div>
        <div
          style={{
            boxSizing: "border-box",
            margin: "0px",
            float: "right",
            padding: "5px",
            textTransform: "capitalize",
          }}
          id="ClientRemovedMsg"
        ></div>
      </div>
      <div id="video_streams" className="videos">
        <div id="localVideoContainer" className="videoContainer">
          <video id="localVideo" autoPlay muted ref={userVideo}></video>
        </div>
      </div>
      <div
        style={{
          position: "fixed",
          bottom: "50px",
          textAlign: "center",
          width: "95%",
          margin: "0px",
        }}
      >
        <button onClick={LeaveMeeting} className="LeaveBtn">
          Leave
        </button>
      </div>
    </div>
  );
};

export default Room;
