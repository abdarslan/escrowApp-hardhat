import { ethers } from 'ethers';
import { useEffect, useState } from 'react';
import deploy from './deploy';
import Escrow from './Escrow';
import EscrowArtifact from './artifacts/contracts/Escrow.sol/Escrow';

const provider = new ethers.providers.Web3Provider(window.ethereum);

export async function approve(escrowContract, signer) {
  const approveTxn = await escrowContract.connect(signer).approve();
  await approveTxn.wait();
}
// Helper function to create escrow object with on-demand blockchain connectivity
function createEscrowObject(contractData, signer = null) {
  return {
    address: contractData.address,
    arbiter: contractData.arbiter,
    beneficiary: contractData.beneficiary,
    value: contractData.value,
    startedAt: contractData.startedAt,
    approvedAt: contractData.approvedAt,
    isApproved: contractData.isApproved || false,
    handleApprove: async () => {
      // Don't allow approval if already approved
      if (contractData.isApproved) {
        console.log('Contract already approved');
        return;
      }

      // Get signer on-demand if not provided
      const currentSigner = signer || provider.getSigner();
      
      // Create contract instance when needed
      const escrowContract = new ethers.Contract(
        contractData.address,
        EscrowArtifact.abi,
        currentSigner
      );

      escrowContract.on('Approved', async () => {
        // Update UI immediately
        document.getElementById(contractData.address).className = 'complete';
        document.getElementById(contractData.address).innerText = "✓ It's been approved!";
        // update approvedAt as well
        // Update server with approval status
        try {
          await fetch(`http://localhost:3001/contracts/${contractData.address}/approve`, {
            method: 'PUT',
          });
          console.log('Contract approval status updated on server');
        } catch (error) {
          console.error('Failed to update approval status on server:', error);
        }
      });

      await approve(escrowContract, currentSigner);
    },
  };
}

function App() {
  const [escrows, setEscrows] = useState([]);
  const [account, setAccount] = useState();
  const [signer, setSigner] = useState();
  const [error, setError] = useState(null);
  useEffect(() => {
    async function getAccounts() {
      const accounts = await provider.send('eth_requestAccounts', []);

      setAccount(accounts[0]);
      setSigner(provider.getSigner());
    }

    getAccounts();
  }, [account]);

  //load existing contracts from server
  useEffect(() => {
    async function loadContracts() {
      try {
        const response = await fetch('http://localhost:3001/contracts');
        if (!response.ok) {
          console.error('Failed to load contracts from server');
          return;
        }
        const contracts = await response.json();
        console.log('Loaded contracts from server:', contracts);
        
        // Convert to escrow objects with on-demand blockchain connectivity
        setEscrows(contracts.map(contract => createEscrowObject({
          ...contract,
          isApproved: contract.isApproved || false, // Default to false for existing contracts
          approvedAt: contract.approvedAt ? contract.approvedAt : null,
        })));
      } catch (error) {
        console.error('Error loading contracts:', error);
      }
    }

    loadContracts();
  }, []);

  async function newContract() {
    const beneficiary = document.getElementById('beneficiary').value;
    const arbiter = document.getElementById('arbiter').value;
    let signerAddress = await provider.getSigner().getAddress();
    // force signer, arbiter and beneficiary to be unique
    console.log('Arbiter:', arbiter, 'Beneficiary:', beneficiary, 'Signer:', signerAddress);
    if (arbiter === beneficiary) {
      setError('Arbiter and Beneficiary cannot be the same address');
      return;
    } else if (arbiter.toLowerCase() === signerAddress.toLowerCase()) {
      setError('Arbiter cannot be the same as the signer');
      return;
    } else if (signerAddress.toLowerCase() === beneficiary.toLowerCase()) {
      setError('Beneficiary cannot be the same as the signer');
      return;
    }
    let value = document.getElementById('amount').value;
    const type = document.getElementById('type').value;
    const startedAt = Math.floor(Date.now() / 1000); // Current time in seconds
    let approvedAt = null;

    if (type === 'ether') {
      value = ethers.utils.parseEther(value);
    }
    const escrowContract = await deploy(signer, arbiter, beneficiary, value);

    // put the contract into server, server is implemented in server/index.js with express port is 3001
    const response = await fetch('http://localhost:3001/contracts', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        address: escrowContract.address,
        arbiter,
        beneficiary,
        value: value.toString(),
        startedAt,
        approvedAt,
        isApproved: false, // New contracts start as not approved
      }),
    });
    if (!response.ok) {
      console.error('Failed to save contract to server');
      return;
    }
    const data = await response.json();
    console.log('Contract saved to server:', data);
    
    // Create escrow object - signer is passed for new contracts
    const escrow = createEscrowObject({
      address: escrowContract.address,
      arbiter,
      beneficiary,
      value: value.toString(),
      startedAt,
      approvedAt,
      isApproved: false, // New contracts start as not approved
    }, signer);

    setEscrows([...escrows, escrow]);
  }
  
  return (
    <>
      <div className="contract">
        <h1> New Contract </h1>
        {error && <div className="error" style={{ color: 'red' }}>{error}</div>}
        <label>
          Arbiter Address
          <input type="text" id="arbiter" />
        </label>

        <label>
          Beneficiary Address
          <input type="text" id="beneficiary" />
        </label>
      <div className="amount" style={{ display: 'inline-flex'}}>
        <label>
          Deposit Amount
          <input type="number" id="amount" style={{ width: '9.4rem', height: '1.5rem' }} />
        </label>
        <select id='type' style={{ height: '2.5rem', marginTop: '1.8rem' }}>
          <option value="wei">Wei</option>
          <option value="ether">Ether</option>
        </select>
      </div>
        <div
          className="button"
          id="deploy"
          onClick={(e) => {
            e.preventDefault();

            newContract();
          }}
        >
          Deploy
        </div>
      </div>

      <div className="existing-contracts">
        <h1> Existing Contracts </h1>

        <div id="container">
          {escrows.map((escrow) => {
            return <Escrow key={escrow.address} {...escrow} />;
          })}
        </div>
      </div>
    </>
  );
}

export default App;
