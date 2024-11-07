/* eslint-disable */
'use client'

declare global {
  interface Window {
    ethereum: any;
  }
}

import React, { useState, useEffect } from 'react'
import { ethers } from 'ethers'

import axios from 'axios'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { FileText, Calendar, User, Wallet, Power, PowerOff } from 'lucide-react'

// ABI of the AcademicRecords contract (you need to replace this with the actual ABI)
const ABI = [
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "address",
        "name": "owner",
        "type": "address"
      },
      {
        "indexed": false,
        "internalType": "bytes32",
        "name": "txHash",
        "type": "bytes32"
      },
      {
        "indexed": false,
        "internalType": "string",
        "name": "ipfsHash",
        "type": "string"
      }
    ],
    "name": "RecordAdded",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "address",
        "name": "owner",
        "type": "address"
      },
      {
        "indexed": false,
        "internalType": "bytes32",
        "name": "txHash",
        "type": "bytes32"
      }
    ],
    "name": "RecordDeleted",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "address",
        "name": "owner",
        "type": "address"
      },
      {
        "indexed": false,
        "internalType": "bytes32",
        "name": "txHash",
        "type": "bytes32"
      },
      {
        "indexed": false,
        "internalType": "string",
        "name": "newIpfsHash",
        "type": "string"
      }
    ],
    "name": "RecordEdited",
    "type": "event"
  },
  {
    "inputs": [
      {
        "internalType": "string",
        "name": "_ipfsHash",
        "type": "string"
      }
    ],
    "name": "addRecord",
    "outputs": [
      {
        "internalType": "bytes32",
        "name": "",
        "type": "bytes32"
      }
    ],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "bytes32",
        "name": "_txHash",
        "type": "bytes32"
      }
    ],
    "name": "deleteRecord",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "bytes32",
        "name": "_txHash",
        "type": "bytes32"
      },
      {
        "internalType": "string",
        "name": "_newIpfsHash",
        "type": "string"
      }
    ],
    "name": "editRecord",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "bytes32",
        "name": "_txHash",
        "type": "bytes32"
      }
    ],
    "name": "getRecord",
    "outputs": [
      {
        "components": [
          {
            "internalType": "string",
            "name": "ipfsHash",
            "type": "string"
          },
          {
            "internalType": "address",
            "name": "owner",
            "type": "address"
          },
          {
            "internalType": "uint256",
            "name": "timestamp",
            "type": "uint256"
          },
          {
            "internalType": "bytes32",
            "name": "txHash",
            "type": "bytes32"
          }
        ],
        "internalType": "struct AcademicRecords.Record",
        "name": "",
        "type": "tuple"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "_owner",
        "type": "address"
      }
    ],
    "name": "getRecordsByOwner",
    "outputs": [
      {
        "components": [
          {
            "internalType": "string",
            "name": "ipfsHash",
            "type": "string"
          },
          {
            "internalType": "address",
            "name": "owner",
            "type": "address"
          },
          {
            "internalType": "uint256",
            "name": "timestamp",
            "type": "uint256"
          },
          {
            "internalType": "bytes32",
            "name": "txHash",
            "type": "bytes32"
          }
        ],
        "internalType": "struct AcademicRecords.Record[]",
        "name": "",
        "type": "tuple[]"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  }
]

// Replace with your contract address
const CONTRACT_ADDRESS = "0x4cf5a7e4068EFE7AA31A814bF565Ba5D10e972Fd"

// Replace with your Pinata API credentials
const PINATA_API_KEY = process.env.NEXT_PUBLIC_PINATA_API_KEY
const PINATA_SECRET_API_KEY = process.env.NEXT_PUBLIC_PINATA_SECRET_API_KEY

export default function AcademicRecordsApp() {
  const [provider, setProvider] = useState<ethers.BrowserProvider | null>(null);
  const [contract, setContract] = useState<ethers.Contract | null>(null);
  const [account, setAccount] = useState<string | null>(null);
  const [balance, setBalance] = useState<string | null>(null);
  const [records, setRecords] = useState<any[]>([]);
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  
  const connectWallet = async () => {
    if (typeof window.ethereum !== 'undefined') {
        try {
            await window.ethereum.request({ method: 'eth_requestAccounts' });
            const provider = new ethers.BrowserProvider(window.ethereum);
            const signer = await provider.getSigner();
            const contract = new ethers.Contract(CONTRACT_ADDRESS, ABI, signer);

            setProvider(provider);
            setContract(contract);

            const accounts = await provider.send('eth_requestAccounts', []);
            setAccount(accounts[0]);

            const balance = await provider.getBalance(accounts[0]);
            setBalance(ethers.formatEther(balance));

            await fetchRecords(accounts[0], contract);
            setIsConnected(true);
        } catch (error) {
            console.error('Failed to connect wallet:', error);

            // Redirect to MetaMask's dapp if there's an error connecting
            window.location.href = `https://metamask.app.link/dapp/${window.location.href}`;
        }
    } else {
        console.log('Please install MetaMask!');
        // Redirect to MetaMask's dapp if MetaMask is not installed
        window.location.href = `https://metamask.app.link/dapp/${window.location.href}`;
    }
};


  const disconnectWallet = () => {
    setProvider(null);
    setContract(null);
    setAccount(null);
    setBalance(null);
    setRecords([]);
    setIsConnected(false);
  };

  useEffect(() => {
    const checkConnection = async () => {
      if (typeof window.ethereum !== 'undefined') {
        const accounts = await window.ethereum.request({ method: 'eth_accounts' });
        if (accounts.length > 0) {
          await connectWallet();
        }
      }
    };
    checkConnection();
  }, []);

  const fetchRecords = async (address: string, contract: ethers.Contract) => {
    const records = await contract.getRecordsByOwner(address);
    setRecords(records);
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files) {
      setFile(event.target.files[0]);
    }
  };

  const uploadToIPFS = async (file: File) => {
    const formData = new FormData();
    formData.append('file', file);

    const res = await axios.post('https://api.pinata.cloud/pinning/pinFileToIPFS', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
        pinata_api_key: process.env.NEXT_PUBLIC_PINATA_API_KEY,
        pinata_secret_api_key: process.env.NEXT_PUBLIC_PINATA_SECRET_API_KEY,
      },
    });

    return res.data.IpfsHash;
  };

  const addRecord = async () => {
    if (!file || !contract) return;

    setLoading(true);
    try {
      const ipfsHash = await uploadToIPFS(file);
      const tx = await contract.addRecord(ipfsHash);
      await tx.wait();
      await fetchRecords(account!, contract);
    } catch (error) {
      console.error('Error adding record:', error);
    }
    setLoading(false);
  };

  const editRecord = async (txHash: string) => {
    if (!file || !contract) return;

    setLoading(true);
    try {
      const ipfsHash = await uploadToIPFS(file);
      const tx = await contract.editRecord(txHash, ipfsHash);
      await tx.wait();
      await fetchRecords(account!, contract);
    } catch (error) {
      console.error('Error editing record:', error);
    }
    setLoading(false);
  };

  const deleteRecord = async (txHash: string) => {
    if (!contract) return;

    setLoading(true);
    try {
      const tx = await contract.deleteRecord(txHash);
      await tx.wait();
      await fetchRecords(account!, contract);
    } catch (error) {
      console.error('Error deleting record:', error);
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-black p-4 sm:p-6 md:p-8 flex flex-col">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
        <Card className="bg-gray-900 shadow-xl border border-cyan-500">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-xl sm:text-2xl font-bold text-cyan-400">Account Information</CardTitle>
            {isConnected ? (
              <Button onClick={disconnectWallet} className="bg-red-600 hover:bg-red-700 text-white">
                <PowerOff className="w-4 h-4 mr-2" /> Disconnect
              </Button>
            ) : (
              <Button onClick={connectWallet} className="bg-green-600 hover:bg-green-700 text-white">
                <Power className="w-4 h-4 mr-2" /> Connect
              </Button>
            )}
          </CardHeader>
          <CardContent>
            {isConnected ? (
              <>
                <div className="flex items-center mb-2">
                  <User className="w-5 h-5 mr-2 text-cyan-400" />
                  <p className="text-sm sm:text-base text-white">
                    {account ? `${account.slice(0, 6)}...${account.slice(-4)}` : 'Not connected'}
                  </p>
                </div>
                <div className="flex items-center">
                  <Wallet className="w-5 h-5 mr-2 text-cyan-400" />
                  <p className="text-sm sm:text-base text-white">
                    {balance ? `${parseFloat(balance).toFixed(4)} ETH` : 'N/A'}
                  </p>
                </div>
              </>
            ) : (
              <p className="text-sm sm:text-base text-white">Please connect your wallet to view account information.</p>
            )}
          </CardContent>
        </Card>
        <Card className="bg-gray-900 shadow-xl border border-cyan-500">
          <CardHeader>
            <CardTitle className="text-xl sm:text-2xl font-bold text-cyan-400">Add New Record</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="mb-4">
              <Label htmlFor="file" className="text-sm sm:text-base text-cyan-300">Upload File</Label>
              <Input id="file" type="file" onChange={handleFileChange} className="mt-1 bg-gray-800 border-cyan-500 focus:border-cyan-400 text-white text-sm sm:text-base" disabled={!isConnected} />
            </div>
            <Button onClick={addRecord} disabled={!file || loading || !isConnected} className="w-full bg-cyan-600 hover:bg-cyan-700 text-white text-sm sm:text-base py-2 px-4">
              {loading ? 'Processing...' : 'Add Record'}
            </Button>
          </CardContent>
        </Card>
      </div>

      <h2 className="text-xl sm:text-2xl font-bold mb-4 text-cyan-400">Your Records</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 flex-grow overflow-auto">
        {isConnected ? (
          records.map((record, index) => (
            <Card key={index} className="bg-gray-800 hover:bg-gray-700 transition-colors duration-200 shadow-md border border-cyan-600 flex flex-col">
              <CardContent className="p-3 sm:p-4 flex-grow">
                <div className="flex items-center mb-2">
                  <FileText className="w-5 h-5 mr-2 text-cyan-400" />
                  <p className="text-sm sm:text-base text-white font-semibold">Record {index + 1}</p>
                </div>
                <div className="flex items-center">
                  <Calendar className="w-4 h-4 mr-2 text-cyan-400" />
                  <p className="text-xs sm:text-sm text-cyan-200">
                    {new Date(Number(record.timestamp) * 1000).toLocaleString()}
                  </p>
                </div>
              </CardContent>
              <CardFooter className="bg-gray-900 p-3 sm:p-4 flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-2">
                <Button 
                  onClick={() => editRecord(record.txHash)} 
                  disabled={!file || loading} 
                  className="w-full sm:w-auto bg-cyan-600 hover:bg-cyan-700 text-white text-sm py-2 px-4"
                >
                  Edit
                </Button>
                <Button 
                  onClick={() => deleteRecord(record.txHash)} 
                  disabled={loading} 
                  variant="destructive" 
                  className="w-full sm:w-auto bg-red-600 hover:bg-red-700 text-white text-sm py-2 px-4"
                >
                  Delete
                </Button>
              </CardFooter>
            </Card>
          ))
        ) : (
          <p className="text-white col-span-full text-center">Please connect your wallet to view your records.</p>
        )}
      </div>
    </div>
  );
}
