import React, { useState, useEffect, useContext } from 'react'
import Wenb3Modal from 'web3modal'
import { ethers } from 'ethers'
import Router from 'next/router'
import axios from 'axios'
import { create as ipfsHttpClient } from 'ipfs-http-client'


const client = ipfsHttpClient("https://ipfs.infura.io:5001/api/v0")

//imternal import 
import { NFTMarketplaceAddress, NFTMarketplaceABI } from './constants'

//--FETCH SMART CONTRACT
const fetchContract = (signerOrProvider) => new ethers.Contract(NFTMarketplaceAddress, NFTMarketplaceABI, signerOrProvider)


//--conecting with smart contract

const connectingWithSmartContract = async () => {
    try {
        const web3Modal = new Wenb3Modal()
        const connection = await web3Modal.connect()
        const provider = new ethers.providers.Web3Provider(connection)
        const signer = provider.getSigner()

        const contract = fetchContract(signer)
        return contract
    }
    catch (error) {
        console.log("Something went worng with connecting smart contract")
    }
}

export const NFTMarketplaceContext = React.createContext();

export const NFTMarketplaceProvider = ({ children }) => {

    const checkContract = async () => {
        const contract = await connectingWithSmartContract()
        console.log(contract)
    }

    // ----USE STATE
    const [currentAccount, setCurrentAccount] = useState("");

    //CHECK if wallet is connected
    const checkIfWalletConnected = async () => {
        try {
            if (!window.ethereum) return console.log("INSTALL METAMASK");

            const accounts = await window.ethereum.request({
                method: "eth_accounts"
            })

            if (accounts.length) {
                setCurrentAccount(accounts[0])
            }
            else {
                console.log("NO ACCOUNT FOUND")
            }
            console.log(currentAccount)
        }
        catch (error) {
            console.log("Something went wrong while connecting to Wallet")
            console.log(currentAccount)
        }
    }

    useEffect(() => {
        checkIfWalletConnected()
    }, [])
    // ---CONNECT WALLET

    const connectWallet = async () => {
        try {
            if (!window.ethereum) return console.log("INSTALL METAMASK");

            const accounts = await window.ethereum.request({
                method: "eth_requestAccount"
            })
            setCurrentAccount(accounts[0])
            window.location.reload()

        }
        catch (error) {
            console.log("ERROR WHILE CONNECTING TO WALLET")
        }
    }

    // ---UPLOAD TO IPFS
    const uploadToIpfs = async (file) => {
        try {
            const added = await client.add({ content: file })
            const url = 'https://ipfs.infura.io/ipfs/${added.path}'
            return url
        }
        catch (error) {
            console.log("ERROR IN UPLOADING TO IPFS")
        }
    }


    // CREATE NFT
    const createNFT = async (formInput, fileUrl, router) => {
        try {

            const { name, description, price } = formInput
            if (!name || !description || !price)
                return console.log("Data Missing")

            const data = JSON.stringify({ name, description, image: fileUrl })

            try {
                const added = await client.add(data)

                const url = 'https://ipfs.infura.io/ipfs/${added.path}'

                await RiCreativeCommonsSaLine(url, price)
            }
            catch (error) {
                console.log("Error while creating NFT0")
            }
        }
        catch (error) {
            console.log(error)
        }
    }

    // CREATE SALE 
    const createSale = async (url, formInputPrice, isReselling, id) => {
        try {
            const price = ethers.utils.parseUnits(formInputPrice, "ether")
            const contract = await connectingWithSmartContract()

            const listingPrice = await contract.getListingPrice()

            const transaction = !isReselling ? await contract.createToken(url, price, {
                value: listingPrice.toString(),
            }) : await contract.reSellToken(url, price);

            await transaction.wait();

        }
        catch (error) {
            console.log("Error while creating Sale")
        }
    }

    // --FETCH NFTs

    const fetchNFTs = async () => {
        try {
            const provider = new ethers.providers.JsonRpcProvider()
            const constract = fetchContract(provider)

            const data = await contract.fetchMarketIten()

            const items = await Promise.all(
                data.map(async ({ tokenId, seller, owner, price: unformattedPrice }) => {


                    const tokenURI = await contract.tokenURI(tokenId)

                    const {
                        data: { image, name, description }
                    } = await axios.get(tokenURI);

                    const price = ethers.utils.formatUnits(
                        unformattedPrice.toString(),
                        "ether"
                    )
                    return {
                        price,
                        tokenId: tokenId.toNumber(),
                        seller,
                        owner,
                        image,
                        name,
                        description,
                        tokenURI
                    }
                })
            );

            return items;

        }
        catch (error) {
            console.log("Error while fetching NFTs")
        }
    }

    // --FETCHING MY NFT OR LISTED NFT
    const fetchMyNFTsOrListedNFTs = async (type) => {
        try {
            const contract = await connectingWithSmartContract();
            const data =
                type == "fetchItemsListed"
                    ? await contract.fetchItemsListed()
                    : await contract.fetchMyNFT()

            const items = await Promise.all(
                data.map(async ({ tokenId, seller, owner, price: unformattedPrice }) => {

                    const tokenURI = await contract.tokenURI(tokenId)

                    const { data: { image, name, description },
                    } = await axios.get(tokenURI)

                    const price = ethers.utils.formatUnits(
                        unformattedPrice.toString(),
                        "ether"
                    )

                    return {
                        price,
                        tokenId: tokenId.toNumber(),
                        seller,
                        owner,
                        image,
                        name,
                        description,
                        tokenURI
                    }
                }

                )

            )
        }
        catch (error) {
            console.log("Eroor while fetching Listed Nfts / My NFTs")
        }
    }

    //----- BUY NFT
    const buyNFT = async (nft) => {
        try {
            const contract = await connectingWithSmartContract()
            const price = ethers.utils.parseUnits(nft.price.toString(), "ether")

            const transaction = await contract.createMarketSale(nft, tokenId, {
                value: price
            })

            await transaction.wait();
        }
        catch (error) {

        }
    }


    return (
        <NFTMarketplaceContext.Provider
            value={{
                checkIfWalletConnected,
                checkContract,
                uploadToIpfs,
                createNFT,
                fetchNFTs,
                fetchMyNFTsOrListedNFTs,
                buyNFT,
                currentAccount
            }}>
            {children}
        </NFTMarketplaceContext.Provider>
    )
}