import React, { useEffect, useState } from "react";
import { ethers } from "ethers";
import "./App.css";
import abi from "./utils/WavePortal.json";

const App = () => {
  const [currentAccount, setCurrentAccount] = useState("");
  const [allMsgs, setAllMsgs] = useState([]);
  const [msg, setMsg] = useState("");

  // Set the contract's address and ABI
  const contractAddress = "0xBfBdFF2FF012363c0378804a111306643c14514d";
  const contractABI = abi.abi;

  const checkIfWalletIsConnected = async () => {
    try {
      // Metamask automatically injects an object named 'ethereum' into the global 'window' object
      const { ethereum } = window;

      // Check if user has Metamask installed, ie ethereum is not null
      if (!ethereum) {
        console.log("Make sure you have metamask!");
        return;
      } else {
        console.log("We have the ethereum object", ethereum);
      }

      // Check if we're authorized to access the user's wallet
      const accounts = await ethereum.request({ method: "eth_accounts" });

      // Found account(s) in web user's (Metamask) wallet.
      if (accounts.length !== 0) {
        const account = accounts[0];
        console.log("Found an authorized account:", account);
        setCurrentAccount(account);

        await getAllMessages();

        // console.log("Retrieved messages");
        // console.log(allMessages);
      } else {
        console.log("No authorized account found");
      }
    } catch (error) {
      console.log(error);
    }
  };

  /**
   * Implement your connectWallet method here
   */
  const connectWallet = async () => {
    try {
      const { ethereum } = window;

      // Check if user has Metamask installed, ie ethereum is not null
      if (!ethereum) {
        alert("Get MetaMask!");
        return;
      }

      // Prompt user to give access to their wallet
      const accounts = await ethereum.request({
        method: "eth_requestAccounts",
      });

      console.log("Connected", accounts[0]);
      setCurrentAccount(accounts[0]);
    } catch (error) {
      console.log(error);
    }
  };

  const getAllMessages = async () => {
    try {
      const { ethereum } = window;
      if (ethereum) {
        // Get 'Provider' object from 'ethereum' object
        const provider = new ethers.providers.Web3Provider(ethereum);

        // Get 'Signer' object from 'Provider'
        const signer = provider.getSigner();

        // Get 'Contract' object
        const wavePortalContract = new ethers.Contract(
          contractAddress,
          contractABI,
          signer
        );

        /*
         * Call the getAllMessages method from your Smart Contract
         */
        const messages = await wavePortalContract.getAllMsgs();

        /*
         * We only need address, timestamp, and message in our UI so let's
         * pick those out
         */
        let msgsCleaned = [];
        messages.forEach((msg) => {
          msgsCleaned.push({
            address: msg.waver,
            timestamp: new Date(msg.timestamp * 1000),
            message: msg.message,
          });
        });

        /*
         * Store our data in React State
         */
        setAllMsgs(msgsCleaned);
        console.log("Below are all messages");
        console.log(allMsgs);
      } else {
        console.log("Ethereum object doesn't exist!");
      }
    } catch (error) {
      console.log(error);
    }
  };

  /**
   * Listen in for emitter events!
   */
  useEffect(() => {
    let wavePortalContract;

    const onNewWave = (from, timestamp, message) => {
      console.log("NewWave", from, timestamp, message);
      setAllMsgs((prevState) => [
        ...prevState,
        {
          address: from,
          timestamp: new Date(timestamp * 1000),
          message: message,
        },
      ]);
    };

    if (window.ethereum) {
      const provider = new ethers.providers.Web3Provider(window.ethereum);
      const signer = provider.getSigner();

      wavePortalContract = new ethers.Contract(
        contractAddress,
        contractABI,
        signer
      );
      wavePortalContract.on("NewWave", onNewWave);
    }

    return () => {
      if (wavePortalContract) {
        wavePortalContract.off("NewWave", onNewWave);
      }
    };
  }, []);

  const sendMsg = async () => {
    try {
      const { ethereum } = window;

      if (ethereum) {
        const provider = new ethers.providers.Web3Provider(ethereum);
        const signer = provider.getSigner();
        const wavePortalContract = new ethers.Contract(
          contractAddress,
          contractABI,
          signer
        );

        let count = await wavePortalContract.getMessagesNumber();
        console.log("Retrieved total message count...", count.toNumber());

        /*
         * Execute the actual wave from your smart contract
         * user pay a set amount of gas of 300,000. And, if they don't
         * use all of it in the transaction they'll automatically be refunded.
         * This ensures that the transaction does'nt fail due to metamask bug.
         */
        const waveTxn = await wavePortalContract.sendMessage(msg, {
          gasLimit: 300000,
        });
        console.log("Mining...", waveTxn.hash);

        await waveTxn.wait();
        console.log("Mined -- ", waveTxn.hash);

        count = await wavePortalContract.getMessagesNumber();
        console.log("Retrieved total wave count...", count.toNumber());

        // Clear the message
        setMsg("");
      } else {
        console.log("Ethereum object doesn't exist!");
      }
    } catch (error) {
      console.log(error);
    }
  };

  useEffect(() => {
    checkIfWalletIsConnected();
  }, []);

  const onInputChange = (event) => {
    setMsg(event.target.value);
  };

  return (
    <div className="mainContainer">
      <div className="dataContainer">
        <div className="header">
          <h2>👋 Hey there!</h2>
        </div>

        <div className="bio">
          I am Saurabh, I am a fullstack developer so that's pretty cool right?
          Connect your Ethereum wallet and message me!
        </div>

        <input
          placeholder="Your message"
          value={msg}
          type="text"
          onChange={onInputChange}
          className="userInput"
        ></input>

        <button className="msgButton" onClick={sendMsg}>
          Send me a message
        </button>

        {/*
         * If there is no currentAccount render this button
         */}
        {!currentAccount && (
          <button className="msgButton" onClick={connectWallet}>
            Connect Wallet
          </button>
        )}
        {allMsgs.map((wave, index) => {
          return (
            <div
              key={index}
              style={{
                backgroundColor: "OldLace",
                marginTop: "16px",
                padding: "8px",
              }}
            >
              <div>Address: {wave.address}</div>
              <div>Time: {wave.timestamp.toString()}</div>
              <div>Message: {wave.message}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default App;
