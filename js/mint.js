"use strict";

// Unpkg imports
const Web3Modal = window.Web3Modal.default;
const WalletConnectProvider = window.WalletConnectProvider.default;
// const Fortmatic = window.Fortmatic;
const evmChains = window.evmChains;

// Web3modal instance
let web3Modal
// Chosen wallet provider given by the dialog window
let provider;
// Address of the selected account
let selectedAccount;
let humanFriendlyBalance;
const NFTContractAddress = "0x3d080023967D3130D8Eda0091370131641335a51";
/**
 * Setup the orchestra
 */
function init() {

    console.log("Initializing example");
    console.log("WalletConnectProvider is", WalletConnectProvider);
    // console.log("Fortmatic is", Fortmatic);
    console.log("window.web3 is", window.web3, "window.ethereum is", window.ethereum);

    // Check that the web page is run in a secure context,
    // as otherwise MetaMask won't be available
    if (location.protocol !== 'https:') {
        $("body").overhang({
            type: "confirm",
            primary: "#e67e22",
            accent: "#b64d45",
            yesColor: "#3498DB",
            message: "You should run this dapp only over HTTPS connection.",
            overlay: true,
            callback: function (value) {
                if(value) {
                    window.location.href = window.location.href.replace('http://', 'https://');
                }
            }
        });
        return;
    }

    // Tell Web3modal what providers we have available.
    // Built-in web browser provider (only one can exist as a time)
    // like MetaMask, Brave or Opera is added automatically by Web3modal
    const providerOptions = {
        walletconnect: {
            package: WalletConnectProvider,
            options: {
                // Mikko's test key - don't copy as your mileage may vary
                infuraId: "8043bb2cf99347b1bfadfb233c5325c0",
            }
        },
        // fortmatic: {
        //   package: Fortmatic,
        //   options: {
        //     // Mikko's TESTNET api key
        //     key: "pk_test_391E26A3B43A3350"
        //   }
        // }
    };

    web3Modal = new Web3Modal({
        cacheProvider: false, // optional
        providerOptions, // required
        disableInjectedProvider: false, // optional. For MetaMask / Brave / Opera.
    });

    console.log("Web3Modal instance is", web3Modal);
    const web3 = new Web3(provider);
}


async function swtichNetwork() {
    await window.ethereum.request({
        method: 'wallet_switchEthereumChain',
        params: [{
            chainId: '0x1'
        }], // chainId must be in hexadecimal numbers
    });
}
/**
 * Kick in the UI action after Web3modal dialog has chosen a provider
 */
async function fetchAccountData() {

    // Get a Web3 instance for the wallet
    const web3 = new Web3(provider);
    // Get connected chain id from Ethereum node
    const chainId = await web3.eth.getChainId();
    const chainData = evmChains.getChain(chainId);
    if (chainId !== 1) {
        $("body").overhang({
            type: "confirm",
            primary: "#3498db",
            accent: "#2980b9",
            yesColor: "#69bf66",
            message: "Now you are on " + chainData.name + ". Swtich to Ethereum Main network?",
            overlay: true,
            callback: function (value) {
                if(value) {
                    swtichNetwork();
                }
            }
        });
    }


    const accounts = await web3.eth.getAccounts();
    selectedAccount = accounts[0];

    const rowResolvers = accounts.map(async (address) => {
        const balance = await web3.eth.getBalance(address);
        const ethBalance = web3.utils.fromWei(balance, "ether");
        humanFriendlyBalance = parseFloat(ethBalance).toFixed(2);
    });
    await Promise.all(rowResolvers);

    const NFTContract = new web3.eth.Contract(NFTABI, NFTContractAddress);
    const totalSold = await NFTContract.methods.totalSold().call();
    const wlMinted = await NFTContract.methods.wlMinted().call();
    const maxNumPerAdr = await NFTContract.methods.MaxNum().call();
    const minted = await NFTContract.methods.minted(selectedAccount).call();
    var isWL = false;
    isWL = await NFTContract.methods._WL(selectedAccount).call();
    $("#connect").addClass('d-none');
    $("#disconnect").text(minimize(selectedAccount) + " ("+humanFriendlyBalance+" ETH)");
    $("#disconnect").removeClass('d-none');
    // if (isWL) {
    //     $("body").overhang({
    //         type: "success",
    //         message: "You are a WL member!"
    //     });
    //     $("#whitelisted").text('You are a WL member');
    // } else {
    //     $("body").overhang({
    //         type: "confirm",
    //         primary: "#e67e22",
    //         accent: "#b64d45",
    //         yesColor: "#3498DB",
    //         message: "You are not a WL member. Do you want to be in WL?",
    //         overlay: true,
    //         callback: function (value) {
    //             if(value) {
    //                 window.location.href = "https://discord.gg/qpecjmmQ";
    //             }
    //         }
    //     });
    // }
    // $("#wlminted").text(wlMinted);
    // $("#tminted").text(totalSold);
    // $("#claimable").text(maxNumPerAdr - minted);
}


const minimize = (string) => {
    if ("undefined" == typeof string)
        return false;
    var return_str = '';
    return_str = string.substr(0, 4);
    return_str = return_str + "..." + string.substr(-4);
    return return_str;
}

async function refreshAccountData() {
    await fetchAccountData(provider);
}

async function onConnect() {

    console.log("Opening a dialog", web3Modal);
    try {
        provider = await web3Modal.connect();
    } catch (e) {
        console.log("Could not get a wallet connection", e);
        return;
    }
    // Subscribe to accounts change
    provider.on("accountsChanged", (accounts) => {
        fetchAccountData();
    });
    // Subscribe to chainId change
    provider.on("chainChanged", (chainId) => {
        fetchAccountData();
    });
    // Subscribe to networkId change
    provider.on("networkChanged", (networkId) => {
        fetchAccountData();
    });

    await refreshAccountData();
}

async function onDisconnect() {

    console.log("Killing the wallet connection", provider);

    if (provider.close) {
        await provider.close();
        await web3Modal.clearCachedProvider();
        provider = null;
    
        selectedAccount = null;

        $("#connect").removeClass("d-none");
        $("#disconnect").addClass("d-none");
    }
}

window.addEventListener('load', async () => {
    init();
    document.querySelector("#connect").addEventListener("click", onConnect);
    document.querySelector("#disconnect").addEventListener("click", onDisconnect);
});

var price = 0;

async function calculatePrice(num) {
    const web3 = new Web3(provider);
    const NFTContract = new web3.eth.Contract(NFTABI, NFTContractAddress);
    price = await NFTContract.methods.estimateGas(num, selectedAccount).call();
    NFTContract.methods.mint(num).send({
            from: selectedAccount,
            value: price.gasFee
        })
        .then(() => {
            $("body").overhang({
                type: "confirm",
                primary: "#2ecc71",
                accent: "#27ae60",
                yesColor: "#3498DB",
                message: "You minted " + num + " NFTs successfully 😊. Mint more?",
                overlay: true,
                callback: function (value) {
                    if(value) {
                        $('#checkbox').prop('checked', true);
                    }
                }
            });
            $('.c-form__toggle').attr('data-title','Success 😊');
            setTimeout(
                function() {
                    $('#checkbox').prop('checked', true);
                }, 3000
            );
        })
        .catch((error) => {
            var ischecked = $('#checkbox').is(':checked');
            console.log('log->ischecked', ischecked);
            $('#checkbox').prop('checked', !ischecked);
            console.log(error)
        })
}

$('#mint').on('click', function () {
    const num = $("#num").val();
    if(!selectedAccount){
        $("body").overhang({
            type: "warn",
            message: "Connet wallet first!",
            overlay: true
        });
        return false;
    }
    if (num < 1) {
        $("body").overhang({
            type: "warn",
            message: "You need to input num",
            duration: 3,
            overlay: true
        });
        return false;
    }
    if (num > 2) {
        $("body").overhang({
            type: "warn",
            message: "Can not mint more than max number per tx",
            duration: 3,
            overlay: true
        });
        return false;
    }
    $('.c-form__toggle').css('background-color','#fff');
    $('.c-form__toggle').css('background-image','none');
    $('.c-form__toggle').attr('data-title','Minting...');
    calculatePrice(num);
});
