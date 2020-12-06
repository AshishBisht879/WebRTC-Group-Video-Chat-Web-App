import React, { useRef } from "react";
import { v1 as uuid } from "uuid";

const CreateRoom = (props) => {
  const constraints = useRef({});
  const currentStream = useRef();

  function create() {
    const id = uuid();
    // props.history.push(`/room/${id}`);

    document.getElementById("InputRoomIDNew").value = id;

    document.getElementById("NewRoomIDStart").style.display = "inline";
    document.getElementById("InputRoomIDStart").style.display = "none";
    document.getElementById("GenerateID").innerHTML = "New Room ID";
    document.getElementById("EnterID").innerHTML = "Join Room";
    document.getElementById("InputRoomIDOld").value = ""; // making the input filed of other RoomID empty
  }

  function joinRoom() {
    document.getElementById("NewRoomIDStart").style.display = "none";
    document.getElementById("InputRoomIDStart").style.display = "inline";
    document.getElementById("GenerateID").innerHTML = "Create New Room";
    document.getElementById("EnterID").innerHTML = "Room ID";

    document.getElementById("InputRoomIDNew").value = ""; // making the input filed of other RoomID empty
  }

  function validateForm() {
    if (document.getElementById("PersonName").value.length !== 0) {
      let data = {};
      if (document.getElementById("InputRoomIDNew").value !== "") {
        data = {
          Person: document.getElementById("PersonName").value,
          Room: document.getElementById("InputRoomIDNew").value,
          StreamConstraints: constraints.current,
        };

        SendDataAndRenderToAnotherPage(data);
      } else if (document.getElementById("InputRoomIDOld").value !== "") {
        data = {
          Person: document.getElementById("PersonName").value,
          Room: document.getElementById("InputRoomIDOld").value,
          StreamConstraints: constraints.current,
        };
        SendDataAndRenderToAnotherPage(data);
      } else alert("!! Enter RoomID");

      // fetch(url, options)
      //    .then(() => {

      //     }) //Redirect to another Route on which data is sent
      //     .catch((err) => {
      //         console.log("\n\nFetch Error\n" + err);
      //     });
    } else alert("!! Enter your Name");
  }

  function SendDataAndRenderToAnotherPage(data) {
    let url = "/room";
    fetch(url, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "access-control-allow-origin": "*",
        "access-control-allow-credentials": true,
      },
      body: JSON.stringify(data),
    })
      .catch((error) => {
        console.log("\nError in Send Data Promise : \n" + error);
      })
      .then((res) => res.json())
      //.then((d) => console.log(d))
      .then(() => {
        props.history.push({
          pathname: url,
          Person_Room_constraint: data, // your data array of object
        });
      });
  }

  GetMediaDevices("videoinput")
    .then((AttachedDevices) => updateCameraList(AttachedDevices))
    .then(() =>
      GetMediaDevices("audioinput").then((AttachedDevices) =>
        updateMicList(AttachedDevices)
      )
    )
    .then(() => CameraSelected());
  //GetMediaDevices return promise (since async/await is used) to further execute statement "then" keyword is used

  async function GetMediaDevices(type) {
    let List_Label = [];
    let List_DeviceID = [];
    await navigator.mediaDevices.enumerateDevices().then((stream) => {
      stream.forEach((cameras) => {
        if (cameras.kind === type) {
          List_Label.push(cameras.label);
          List_DeviceID.push(cameras.deviceId);
        }
      });
    });
    return {
      List_Label,
      List_DeviceID,
    };
  }
  /*
      The above function is used with async/await block because  without using async/await the functino behaves asynchronous means before finishing the navigaotr line sequencly the return statement get execute thus invalid result
      */

  function updateCameraList(List) {
    try {
      let choose = document.getElementById("CamerasList");
      let count = 1;
      choose.innerHTML = "";
      List.List_Label.forEach(function (camera, index) {
        const option = document.createElement("option");
        option.label = camera || `Camera ${count++}`;
        option.value = List.List_DeviceID[index];
        choose.appendChild(option);
      });
      choose.selectedIndex = "0"; //select the first value as default
    } catch (err) {
      console.log("\n\n!!Error in updateCameraList\n" + err);
      alert(
        "!! You have either attached a new media device or removed a media device.\n To use another media device join the Room again. !!"
      );
    }
  }

  function updateMicList(List) {
    try {
      let choose = document.getElementById("MicList");
      let count = 1;
      choose.innerHTML = "";
      List.List_Label.forEach(function (mic, index) {
        const option = document.createElement("option");
        option.label = mic || `Mic ${count++}`;
        option.value = List.List_DeviceID[index];
        choose.appendChild(option);
      });
      choose.selectedIndex = "0";
    } catch (err) {
      console.log("\n\n!!Error in updateMicList!!\n" + err);
    }
  }

  //stop the current stream running on
  function stopMediaTracks(stream) {
    try {
      stream.getTracks().forEach((track) => {
        track.stop();
      });
    } catch (err) {
      return 1;
    }
  }

  function CameraSelected() {
    let select = document.getElementById("CamerasList");
    let select2 = document.getElementById("MicList");
    if (typeof currentStream.current != "undefined")
      stopMediaTracks(currentStream.current);

    if (
      select == null ||
      select.value === "" ||
      select2 == null ||
      select2.value === ""
    ) {
      constraints.current.video = {
        facingMode: {
          exact: "user",
        },
      };
      constraints.current.audio = true;
    } else {
      constraints.current.video =
        {
          deviceId: {
            exact: select.value,
          },
        } || true;
      constraints.current.audio =
        {
          deviceId: {
            exact: select2.value,
          },
        } || true;
    }

    // Get access to the camera!
    navigator.mediaDevices &&
      navigator.mediaDevices
        .getUserMedia(constraints.current)
        .then(function (mediaStreamObj) {
          let video = document.getElementById("media");
          video.muted = true;
          currentStream.current = mediaStreamObj;
          if ("srcObject" in video) {
            video.srcObject = mediaStreamObj;
          } else {
            //OLD VERSION
            video.scr = window.URL.createObjectURL(mediaStreamObj);
          }

          video.onloadedmetadata = function () {
            video.play();
          };
        })
        .catch((error) => {
          console.log(error);
        });
  }

  function ChangesInDevices() {
    try {
      GetMediaDevices("videoinput")
        .then((AttachedDevices) => updateCameraList(AttachedDevices))
        .then(() =>
          GetMediaDevices("audioinput").then((AttachedDevices) =>
            updateMicList(AttachedDevices)
          )
        )
        .then(() => stopMediaTracks(currentStream.current))
        .then(() => CameraSelected());
    } catch (err) {
      console.log("\n\n!!Error in ChangeInDevice!!\n" + err);
    }
  }

  //if some new device is plugged in
  navigator.mediaDevices.addEventListener("devicechange", (event) => {
    try {
      ChangesInDevices();
    } catch (err) {
      console.log("\n\n!!Error in devicechange event listener!!\n" + err);
      alert(
        "!!You have either added a new media device or removed a media device.\n To use the new media device Join the Room again.!!"
      );
    }
  });

  return (
    <div>
      <h1 style={{ textAlign: "center" }}>Video Chat Room</h1>
      <div style={{ display: "inline-block" }}>
        <div
          style={{
            float: "left",
            border: "1px solid",
            padding: "10px",
          }}
        >
          <video id="media" style={{ width: "100%", height: "100%" }}></video>

          <div className="ChangeMedia">
            {/* <div className="SelectCamera">
                            <button id="TurnOffCamera">Turn OFF</button> 
            </div> */}
            <div className="SelectCamera">
              <span>Camera :</span>
              <select id="CamerasList" onChange={CameraSelected}>
                {/* Here Available Camera List will appear */}
              </select>
            </div>
            {/* <div className="SelectMic">
                            <button id="TurnOffMic">Turn OFF</button> Mic :
            </div> */}

            <div className="SelectMic">
              <span>Mic :</span>
              <select id="MicList" onChange={CameraSelected}>
                {/* Here Available Mic List will appear */}
              </select>
            </div>
          </div>
        </div>

        <div
          style={{
            float: "right",
            textAlign: "center",
            padding: "10px",
          }}
        >
          <fieldset style={{ padding: "20px" }}>
            <legend>Room:</legend>
            <span>Your Name : </span>
            <input
              type="text"
              id="PersonName"
              placeholder="Your Name .."
              required
            />
            <div>
              <button
                type="button"
                id="GenerateID"
                style={{ display: "inline" }}
                onClick={create}
              >
                Create New Room
              </button>
              <div id="NewRoomIDStart" style={{ display: "none" }}>
                <input type="text" id="InputRoomIDNew" readOnly></input>
                <button type="button" onClick={validateForm}>
                  Start Video Chat
                </button>
              </div>
            </div>

            <div>
              <button
                type="button"
                id="EnterID"
                style={{ display: "inline" }}
                onClick={joinRoom}
              >
                Join Room
              </button>
              <div id="InputRoomIDStart" style={{ display: "none" }}>
                <input
                  type="text"
                  id="InputRoomIDOld"
                  placeholder="Enter Room ID.."
                ></input>
                <button type="button" onClick={validateForm}>
                  Start Video Chat
                </button>
              </div>
            </div>
          </fieldset>
        </div>
      </div>
    </div>
  );
};

export default CreateRoom;
