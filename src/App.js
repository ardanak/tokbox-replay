import React from "react";
import { SAMPLE_SERVER_BASE_URL, API_KEY, SESSION_ID, TOKEN } from "./config";
import { OTSession, OTPublisher, OTStreams, OTSubscriber, createSession } from "opentok-react";
import axios from 'axios';

class App extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      error: null,
      connection: "Connecting",
      message: '',
      messages: [],
      publishVideo: true,
      streams: [],
      apiKey: props.credentials.apiKey,
      sessionId: props.credentials.sessionId,
      token: props.credentials.token,
      time: 0,
    };

    this.sessionEventHandlers = {
      sessionConnected: () => {
        this.setState({ connection: "Connected" });
      },
      sessionDisconnected: () => {
        this.setState({ connection: "Disconnected" });
      },
      sessionReconnected: () => {
        this.setState({ connection: "Reconnected" });
      },
      sessionReconnecting: () => {
        this.setState({ connection: "Reconnecting" });
      },
      signal: event => { console.log(event.data)}
    };

    this.publisherEventHandlers = {
      accessDenied: () => {
        console.log("User denied access to media source");
      },
      streamCreated: () => {
        console.log("Publisher stream created");
      },
      streamDestroyed: ({ reason }) => {
        console.log(`Publisher stream destroyed because: ${reason}`);
      }
    };

    this.subscriberEventHandlers = {
      videoEnabled: () => {
        console.log("Subscriber video enabled");
      },
      videoDisabled: () => {
        console.log("Subscriber video disabled");
      }
    };

    this.sessionHelper = createSession({
      apiKey: this.state.apiKey,
      sessionId: this.state.sessionId,
      token: this.state.token,
      onStreamsUpdated: streams => { this.setState({ streams }); }
    });

    this.sessionHelper.session.on('signal', event => {
      const { messages, time } = this.state
      axios.post('https://chat-replay-api.herokuapp.com/api/messages', {
        "body": event.data,
        "replay_time": time,
        "topic": this.state.sessionId,
        "user": "someone"
    })
      const newMessages = [...messages, event]
      this.setState({ messages: newMessages, time: time+0.2 })
    })

    this.handleInput = this.handleInput.bind(this)
    this.handleEnter = this.handleEnter.bind(this)
  }

  componentWillUnmount() {
    this.sessionHelper.disconnect();
  }

  handleInput(e) {
    const body = e.currentTarget.value
    this.setState({ message: body })
  }

  handleEnter(e) {
    if (e.key === 'Enter') {
      const session = this.sessionHelper.session
      session.signal({
        data: this.state.message
      }, (error) => {
        if (error) {
          console.log("signal error ("
                       + error.name
                       + "): " + error.message);
        } else {
          this.setState({ message: '' })
          console.log("signal sent.");
        }
      })
    }
  }

  onSessionError = error => {
    this.setState({ error });
  };

  onPublish = () => {
    console.log("Publish Success");
  };

  onPublishError = error => {
    this.setState({ error });
  };

  onSubscribe = () => {
    console.log("Subscribe Success");
  };

  onSubscribeError = error => {
    this.setState({ error });
  };

  toggleVideo = () => {
    this.setState({ publishVideo: !this.state.publishVideo });
  };

  render() {
    console.log(this.state)
    const { error, connection, publishVideo } = this.state;
    return (
      <div>
        <div id="videos">
          <div id="sessionStatus">Session Status: {connection}</div>
          {error ? (
            <div className="error">
              <strong>Error:</strong> {error}
            </div>
          ) : null}
            <button id="videoButton" onClick={this.toggleVideo}>
              {publishVideo ? "Disable" : "Enable"} Video
            </button>
            <OTPublisher
              session={this.sessionHelper.session}
              properties={{ publishVideo, width: 500, height: 500 }}
              onPublish={this.onPublish}
              onError={this.onPublishError}
              eventHandlers={this.publisherEventHandlers}
            />

              {this.state.streams.map(stream => {
                        return (
                          <OTSubscriber
                            key={stream.id}
                            session={this.sessionHelper.session}
                            properties={{ width: 1000, height: 1000 }}
                            stream={stream}
                            onError={this.onSubscribeError}
                            onSubscribe={this.onSubscribe}
                            eventHandlers={this.subscriberEventHandlers}

                          />
                        );
                      })}

        </div>
        <div id="textchat">
          <input
            value={this.state.message}
            onChange={this.handleInput}
            onKeyPress={this.handleEnter}
            type="text"
            placeholder="Input your text here" id="msgTxt"
          />
          <div className='messages'>
            {this.state.messages.map((m, idx) => {
              return <p key={idx}>{m.data}</p>
            })}
          </div>
        </div>
      </div>
    );
  }
}

export default App;
