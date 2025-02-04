import { useState, useEffect, useRef } from "react";
import { supabase } from "../supabaseClient";
function App() {
  const [session, setSession] = useState([]);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const [onlineUsers, setOnlineUsers] = useState([]);
  const chatContainerRef = useRef(null);
  const scroll = useRef();

  //below code is from supabase auth
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);
  console.log(session);

  const signIn = async () => {
    await supabase.auth.signInWithOAuth({
      provider: "google",
    });
  };

  const signOut = async () => {
    const { error } = await supabase.auth.signOut();
  };

  useEffect(() => {
    if (!session?.user) {
      setOnlineUsers([]);
      return;
    }
    const chatRoom = supabase.channel("chat_room", {
      config: {
        presence: {
          key: session?.user?.id,
        },
      },
    });
    chatRoom.on("broadcast", { event: "message" }, (payload) => {
      setMessages((prev) => [...prev, payload.payload]);
      console.log(messages);
    });

    //tracking user presence
    chatRoom.subscribe(async (status) => {
      if (status === "SUBSCRIBED") {
        await chatRoom.track({
          id: session?.user?.id,
        });
      }
    });

    //handling user presence
    chatRoom.on("presence", { event: "sync" }, () => {
      const state = chatRoom.presenceState();
      setOnlineUsers(Object.keys(state));
    });

    return () => {
      chatRoom.unsubscribe();
    };
  }, [session]);

  //sending message
  const sendMessage = async (e) => {
    e.preventDefault();
    supabase.channel("chat_room").send({
      type: "broadcast",
      event: "message",
      payload: {
        message: newMessage,
        user_name: session?.user?.user_metadata?.email,
        avatar: session?.user?.user_metadata?.avatar_url,
        timestamp: new Date().toISOString(),
      },
    });
    setNewMessage("");
  };

  const formatTime = (isoString) => {
    return new Date(isoString).toLocaleTimeString("en-us", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
  };

  useEffect(() => {
    setTimeout(() => {
      if (chatContainerRef.current) {
        chatContainerRef.current.scrollTop =
          chatContainerRef.current.scrollHeight;
      }
    }, [100]);
  }, [messages]);

  if (!session) {
    return (
      <div className="flex w-full h-screen justify-center items-center bg-gray-900 text-white">
        <button
          onClick={signIn}
          className="cursor-pointer p-2 bg-gray-800 rounded-lg"
        >
          Sign in with Google to Chit-Chat
        </button>
      </div>
    );
  } else {
    return (
      <div className="flex w-full h-screen justify-center items-center p-4 bg-gray-900 text-white">
        <div className="border-[1px] w-full border-gray-700 max-w-6xl min-h-[600px] rounded-lg">
          <div className="flex justify-between h-20 border-b-[1px] border-gray-700">
            <div className="p-4">
              <p className="text-gray-300">
                Signed in as {session?.user?.user_metadata?.email}
              </p>
              <p className="text-gray-300 italic text-sm">
                {onlineUsers.length} users online
              </p>
            </div>
            <button
              onClick={signOut}
              className="m-2 sm:mr-2 p-2 bg-gray-800 rounded-lg cursor-pointer"
            >
              Sign out
            </button>
          </div>
          {/* chat section */}
          <div
            ref={chatContainerRef}
            className="p-4 flex flex-col overflow-y-auto h-[500px]"
          >
            {messages.map((msg, index) => (
              <div
                key={index}
                className={`my-2 flex w-full items-start ${
                  msg?.user_name === session?.user?.email
                    ? "justify-end"
                    : "justify-start"
                }`}
              >
                {/* {" avatar"} */}
                {msg?.user_name !== session?.user?.email && (
                  <img
                    src={msg?.avatar}
                    alt=""
                    className="w-10 h-10 mr-2 rounded-full"
                  />
                )}
                <div className="flex flex-col w-full">
                  <div
                    className={`p-1 max-w-[70%] roundex-xl ${
                      msg?.user_name === session?.user?.email
                        ? "bg-gray-700 text-white ml-auto"
                        : "bg-gray-400 text-white mr-auto"
                    }`}
                  >
                    <p>{msg.message}</p>
                  </div>
                  <div
                    className={`text-xs opacity-75 pt-1 ${
                      msg?.user_name === session?.user?.email
                        ? "text-right mr-2"
                        : "text-left ml-2"
                    }`}
                  >
                    {formatTime(msg?.timestamp)}
                  </div>
                </div>
                {msg?.user_name === session?.user?.email && (
                  <img
                    src={msg.avatar}
                    alt=""
                    className="w-10 h-10 rounded-full ml-2"
                  />
                )}
              </div>
            ))}{" "}
          </div>
          <form
            onSubmit={sendMessage}
            className="flex flex-col sm:flex-row p-4 border-t-[1px] border-gray-700"
          >
            <input
              type="text"
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder="Type a message..."
              className="p-2 w-full bg-[#00000040] rounded-lg"
            />
            <button className="mt-4 sm:mt-0 sm:ml-8 p-2 bg-gray-800 rounded-lg">
              Send
            </button>
            <span ref={scroll}></span>
          </form>
        </div>
      </div>
    );
  }
}

export default App;
// google clientid= 508697934776-d6t2hu2sfrp2q4v431m77itvvcmiui10.apps.googleusercontent.com
// google_secret= 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
