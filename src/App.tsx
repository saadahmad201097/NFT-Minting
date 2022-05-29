import React, {
  useState,
  ChangeEvent,
  useRef,
  useEffect,
} from "react";
import axios from "axios";
import Web3 from "web3";
import { mintAbi } from "./mintAbi";
import { mintAdd } from "./mintAdd";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import "./App.css";

interface NFT {
  name: string;
  description: string;
  type: string;
}

const toastConfig = {
  position: "bottom-right",
  autoClose: 5000,
  hideProgressBar: false,
  closeOnClick: true,
  pauseOnHover: true,
  draggable: true,
  progress: undefined,
};

export default function App() {
  const [web3connected, setWeb3Connected] = useState<boolean>(false);
  const [selectedAddress, setSelectedAddress] = useState<string>("");

  const [selectedFile, setSelectedFile] = useState<null | File>(null);
  const [nftObj, setNFTObj] = useState<NFT>({
    name: "",
    description: "",
    type: "",
  });

  const hiddenFileInput = React.useRef<HTMLInputElement>(null);

  useEffect(() => {}, []);

  const connect = async () => {
    if (
      window?.ethereum !== undefined &&
      window.ethereum.chainId === "0x4" &&
      !web3connected
    ) {
      try {
        await window.ethereum.enable();

        const web3 = new Web3(window.ethereum);
        const accounts = await web3.eth.getAccounts();
        setWeb3Connected(true);
        if (accounts) setSelectedAddress(accounts[0]);
      } catch (err) {}
    } else {
      setWeb3Connected(false);
      setSelectedAddress("");
    }
  };

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    if (event && event?.target?.files && event.target.files.length > 0) {
      const file = event.target.files[0];
      if (
        file.type === "image/jpeg" ||
        file.type === "image/png" ||
        file.type === "image/jpg"
      ) {
        console.log("cal", event?.target?.files[0]);
        setSelectedFile(event?.target?.files[0]);
      } else {
        toast("Only images with .png, .jpeg and .jpg allowed");
      }
    }
  };

  const disableButton = (): boolean => {
    if (
      !nftObj.name ||
      !nftObj.description ||
      !nftObj.type ||
      selectedFile === null ||
      !web3connected
    )
      return true;
    return false;
  };

  const mintNft = async () => {
    if (disableButton()) {
      toast("Please fill the form properly");
      return;
    }

    if (window?.ethereum !== undefined && window.ethereum.chainId === "0x4") {
      let formDataFile = new FormData();
      if (selectedFile) formDataFile.append("image", selectedFile);
      axios
        .post("https://ipfs.infura.io:5001/api/v0/add", formDataFile)
        .then((res) => {
          const fileData = JSON.stringify({
            name: nftObj.name,
            description: nftObj.description,
            image: res.data.Hash,
            properties: { type: nftObj.type },
          });
          const blob = new Blob([fileData], { type: "text/plain" });
          let formData = new FormData();
          formData.append("path", blob);
          axios
            .post("https://ipfs.infura.io:5001/api/v0/add", formData)
            .then(async (hashRes) => {
              console.log(hashRes.data);
              const web3 = new Web3(window?.ethereum);
              let mintContract = new web3.eth.Contract(mintAbi, mintAdd);
              let mintRes = await mintContract.methods
                .awardItem(selectedAddress, hashRes.data.Hash)
                .send({ from: selectedAddress });
              if (mintRes) {
                setNFTObj({ name: "", description: "", type: "" });
                setSelectedFile(null);
                toast("Minted Successfully");
              } else {
                toast("Something went wrong while making mint transaction.");
              }
            })
            .catch((err) => {
              console.log(err);
              toast("Something went wrong while minting nft.");
            });
        })
        .catch((err) => {
          console.log(err);
          toast("Something went wrong while minting nft.");
        });
    }
  };

  const handleChange = (
    event: ChangeEvent<HTMLInputElement> | ChangeEvent<HTMLSelectElement>
  ) => {
    console.log(event.target.name, event.target.value);
    setNFTObj((prevState) => ({
      ...prevState,
      [event.target.name]: event.target.value,
    }));
  };

  return (
    <div className="App">
      <button onClick={connect} className="connectButton">
        {web3connected ? "Connected" : "Connect"}
      </button>
      <div style={{ width: "50%" }}>
        {selectedFile ? <img src={URL.createObjectURL(selectedFile)} /> : ""}
      </div>

      <div className="form">
        <div className="container">
          <label>Select File</label>
          <input
            type="file"
            id={"file"}
            onChange={handleFileChange}
            style={{ display: "none" }}
            ref={hiddenFileInput}
          />
        </div>
        <button
          onClick={() => {
            hiddenFileInput?.current?.click();
          }}
        >
          Select File
        </button>

        <div className="container">
          <label>NFT Name</label>
          <input
            type="text"
            onChange={handleChange}
            name={"name"}
            value={nftObj.name}
          />
        </div>

        <div className="container">
          <label>NFT Description</label>
          <input
            type="text"
            onChange={handleChange}
            name={"description"}
            value={nftObj.description}
          />
        </div>

        <div className="container">
          <label>NFT Type</label>
          <select
            onChange={(e) => {
              handleChange(e);
            }}
            name={"type"}
          >
            <option value={""}>Select NFT Type</option>
            <option value={"art"}>2D Art</option>
            <option value={"document"}>Document</option>
            <option value={"portfolio"}>Portfolio</option>
          </select>
        </div>
        <button onClick={() => (web3connected ? mintNft() : connect())}>
          {web3connected ? "Create NFT" : "Connect Wallet"}
        </button>
      </div>

      <ToastContainer
        position="bottom-right"
        autoClose={3000}
        hideProgressBar={false}
        newestOnTop={false}
        closeOnClick
        rtl={false}
        pauseOnFocusLoss
      />
    </div>
  );
}
