const { expect } = require('chai')
const { ethers } = require('hardhat')

describe('SharedWallet', function () {
  async function createWallet(accounts, requiredApprovals) {
    const SharedWallet = await ethers.getContractFactory('SharedWallet')
    const wallet = await SharedWallet.deploy(accounts, requiredApprovals)
    await wallet.deployed()

    return wallet
  }

  it('should be deployed with a set of members', async function () {
    const [owner, acc2, acc3] = await ethers.getSigners()
    const wallet = await createWallet([acc2.address], 1)

    const acc2Membership = await wallet.members(acc2.address)
    expect(acc2Membership).to.equal(true)

    const acc3Membership = await wallet.members(acc3.address)
    expect(acc3Membership).to.equal(false)
  })

  it('should include owner as a member', async function () {
    const [owner, acc2] = await ethers.getSigners()
    const wallet = await createWallet([acc2.address], 1)

    const ownerMembership = await wallet.members(owner.address)
    expect(ownerMembership).to.equal(true)
  })

  it('should be deployed with a predefined required number of approvals', async function () {
    const requiredApprovals = 1

    const [owner, acc2] = await ethers.getSigners()
    const wallet = await createWallet([acc2.address], requiredApprovals)

    expect(await wallet.requiredApprovals()).to.equal(requiredApprovals)
  })

  // transaction proposals
  it('should allow members to propose a transaction', async function () {
    const [owner, acc2, acc3] = await ethers.getSigners()
    const wallet = await createWallet([acc2.address], 1)

    // transaction proposal details
    const to = acc3.address
    const value = ethers.utils.parseEther('1')

    // making sure there's no proposal at index 0 before adding the first proposal
    await expect(wallet.transactions(0)).to.be.revertedWith('CALL_EXCEPTION')

    await wallet.proposeTransaction(to, { value })

    proposal = await wallet.transactions(0)
    expect(proposal.to).to.equal(to)
    expect(proposal.value).to.equal(value)
  })

  it('should prevent non-members from proposing a transaction', async function () {
    const [owner, acc2, acc3, acc4] = await ethers.getSigners()
    const wallet = await createWallet([acc2.address], 1)

    // transaction proposal details
    const to = acc3.address
    const value = ethers.utils.parseEther('1')

    await expect(
      wallet.connect(acc4).proposeTransaction(to, { value }),
    ).to.be.revertedWith('NotAMember')

    // making sure transaction was not added
    await expect(wallet.transactions(0)).to.be.revertedWith('CALL_EXCEPTION')
  })

  // approving transaction proposals
  it('should allow members to approve a transaction proposal', async function () {
    const [owner, acc2, acc3] = await ethers.getSigners()
    const wallet = await createWallet([acc2.address], 1)

    const to = acc3.address
    const value = ethers.utils.parseEther('1')

    await wallet.proposeTransaction(to, { value })

    let approvalCount = await wallet.getApprovalCount(0)
    expect(approvalCount).to.equal(0)

    await wallet.connect(acc2).approveTransaction(0)

    approvalCount = await wallet.getApprovalCount(0)
    expect(approvalCount).to.equal(1)
  })

  it('should prevent members to approve their own transaction proposal', async function () {
    const [owner, acc2, acc3] = await ethers.getSigners()
    const wallet = await createWallet([acc2.address], 1)

    const to = acc3.address
    const value = ethers.utils.parseEther('1')

    await wallet.proposeTransaction(to, { value })

    await expect(wallet.approveTransaction(0)).to.be.revertedWith(
      'SelfApprovalNotAllowed',
    )

    let approvalCount = await wallet.getApprovalCount(0)
    expect(approvalCount).to.equal(0)
  })

  it('should prevent members to approve unexisting transaction proposal', async function () {
    const [owner, acc2] = await ethers.getSigners()
    const wallet = await createWallet([acc2.address], 1)

    await expect(wallet.approveTransaction(0)).to.be.revertedWith(
      'TransactionNotFound',
    )
  })

  it('should prevent members to approve an already executed transaction proposal', async function () {
    const [owner, acc2, acc3] = await ethers.getSigners()
    const wallet = await createWallet([acc2.address, acc3.address], 1)

    // propose a transaction
    const to = acc3.address
    const value = ethers.utils.parseEther('1')
    await wallet.proposeTransaction(to, { value })
    await wallet.connect(acc2).approveTransaction(0)

    // execute the transaction
    await wallet.executeTransaction(0)

    await expect(wallet.connect(acc3).approveTransaction(0)).to.be.revertedWith(
      'TransactionAlreadyExecuted',
    )
  })

  it('should prevent members to approve a transaction proposal twice', async function () {
    const [owner, acc2, acc3] = await ethers.getSigners()
    const wallet = await createWallet([acc2.address], 1)

    const to = acc3.address
    const value = ethers.utils.parseEther('1')

    await wallet.proposeTransaction(to, { value })

    await wallet.connect(acc2).approveTransaction(0)

    await expect(wallet.connect(acc2).approveTransaction(0)).to.be.revertedWith(
      'TransactionAlreadyApproved',
    )

    let approvalCount = await wallet.getApprovalCount(0)
    expect(approvalCount).to.equal(1)
  })

  it('should prevent non-members to approve transaction proposals', async function () {
    const [owner, acc2, acc3, acc4] = await ethers.getSigners()
    const wallet = await createWallet([acc2.address], 1)

    const to = acc3.address
    const value = ethers.utils.parseEther('1')
    await wallet.proposeTransaction(to, { value })

    await expect(wallet.connect(acc4).approveTransaction(0)).to.be.revertedWith(
      'NotAMember',
    )

    let approvalCount = await wallet.getApprovalCount(0)
    expect(approvalCount).to.equal(0)
  })

  // executing transaction proposals
  it('should allow execution of an approved transaction proposal by the proposer', async function () {
    const [owner, acc2, acc3] = await ethers.getSigners()
    const wallet = await createWallet([acc2.address], 1)

    const to = acc3.address
    const value = ethers.utils.parseEther('1')
    await wallet.proposeTransaction(to, { value })
    await wallet.connect(acc2).approveTransaction(0)

    let proposal = await wallet.transactions(0)
    expect(proposal.executed).to.be.false
    await wallet.executeTransaction(0)

    proposal = await wallet.transactions(0)
    expect(proposal.executed).to.be.true
  })

  it('should prevent execution of an approved transaction proposal by other members', async function () {
    const [owner, acc2, acc3] = await ethers.getSigners()
    const wallet = await createWallet([acc2.address, acc3.address], 1)

    const to = acc3.address
    const value = ethers.utils.parseEther('1')
    await wallet.proposeTransaction(to, { value })
    await wallet.connect(acc2).approveTransaction(0)

    await expect(wallet.connect(acc3).executeTransaction(0)).to.be.revertedWith(
      'NotAllowed',
    )

    let proposal = await wallet.transactions(0)
    expect(proposal.executed).to.be.false
  })

  it('should prevent execution of an unexisting transaction proposal', async function () {
    const [owner, acc2, acc3] = await ethers.getSigners()
    const wallet = await createWallet([acc2.address], 1)

    await expect(wallet.connect(acc2).executeTransaction(0)).to.be.revertedWith(
      'TransactionNotFound',
    )
  })

  it('should prevent execution of an unapproved transaction proposal', async function () {
    const [owner, acc2, acc3] = await ethers.getSigners()
    const wallet = await createWallet([acc2.address], 1)

    const to = acc3.address
    const value = ethers.utils.parseEther('1')
    await wallet.proposeTransaction(to, { value })

    await expect(wallet.executeTransaction(0)).to.be.revertedWith(
      'NotEnoughApprovals',
    )

    let proposal = await wallet.transactions(0)
    expect(proposal.executed).to.be.false
  })

  it('should prevent execution of an already executed transaction', async function () {
    const [owner, acc2, acc3] = await ethers.getSigners()
    const wallet = await createWallet([acc2.address], 1)

    const to = acc3.address
    const value = ethers.utils.parseEther('1')
    await wallet.proposeTransaction(to, { value })
    await wallet.connect(acc2).approveTransaction(0)

    await wallet.executeTransaction(0)
    await expect(wallet.executeTransaction(0)).to.be.revertedWith(
      'TransactionAlreadyExecuted',
    )
  })

  it('should prevent non-members from executing a transaction proposal', async function () {
    const [owner, acc2, acc3] = await ethers.getSigners()
    const wallet = await createWallet([acc2.address], 1)

    const to = acc3.address
    const value = ethers.utils.parseEther('1')
    await wallet.proposeTransaction(to, { value })
    await wallet.connect(acc2).approveTransaction(0)

    await expect(wallet.connect(acc3).executeTransaction(0)).to.be.revertedWith(
      'NotAMember',
    )

    let proposal = await wallet.transactions(0)
    expect(proposal.executed).to.be.false
  })

  // revoking approvals
  it('should allow members to revoke their own approval for a transaction proposal', async function () {
    const [owner, acc2, acc3] = await ethers.getSigners()
    const wallet = await createWallet([acc2.address], 1)

    const to = acc3.address
    const value = ethers.utils.parseEther('1')

    // propose a transaction, making sure there's no approvals initially
    await wallet.proposeTransaction(to, { value })
    let approvalCount = await wallet.getApprovalCount(0)
    expect(approvalCount).to.equal(0)

    // approve the transaction
    await wallet.connect(acc2).approveTransaction(0)
    approvalCount = await wallet.getApprovalCount(0)
    expect(approvalCount).to.equal(1)

    // revoke the transaction
    await wallet.connect(acc2).revokeTransaction(0)
    approvalCount = await wallet.getApprovalCount(0)
    expect(approvalCount).to.equal(0)
  })

  it('should prevent members from revoking an unexisting transaction', async function () {
    const [owner, acc2] = await ethers.getSigners()
    const wallet = await createWallet([acc2.address], 1)

    // revoke the transaction
    await expect(wallet.connect(acc2).revokeTransaction(0)).to.be.revertedWith(
      'TransactionNotFound',
    )
  })

  it('should prevent members from revoking a transaction they did not approve', async function () {
    const [owner, acc2, acc3] = await ethers.getSigners()
    const wallet = await createWallet([acc2.address, acc3.address], 1)

    const to = acc3.address
    const value = ethers.utils.parseEther('1')

    // propose a transaction, making sure there's no approvals initially
    await wallet.proposeTransaction(to, { value })
    await wallet.connect(acc2).approveTransaction(0);
    let approvalCount = await wallet.getApprovalCount(0)
    expect(approvalCount).to.equal(1)

    // revoke the transaction
    await expect(wallet.connect(acc3).revokeTransaction(0)).to.be.revertedWith(
      'NotApproved',
    )
    approvalCount = await wallet.getApprovalCount(0)
    expect(approvalCount).to.equal(1)
  })

  it('should prevent members from revoking their own approval for an executed transaction', async function () {
    const [owner, acc2, acc3] = await ethers.getSigners()
    const wallet = await createWallet([acc2.address], 1)

    const to = acc3.address
    const value = ethers.utils.parseEther('1')
    await wallet.proposeTransaction(to, { value })
    await wallet.connect(acc2).approveTransaction(0)
    await wallet.executeTransaction(0)

    await expect(wallet.connect(acc2).revokeTransaction(0)).to.be.revertedWith(
      'TransactionAlreadyExecuted',
    )
  })

  it('should prevent non-members from revoking approvals', async function () {
    const [owner, acc2, acc3] = await ethers.getSigners()
    const wallet = await createWallet([acc2.address], 1)

    const to = acc3.address
    const value = ethers.utils.parseEther('1')
    await wallet.proposeTransaction(to, { value })
    await wallet.connect(acc2).approveTransaction(0)
    await wallet.executeTransaction(0)

    await expect(wallet.connect(acc3).revokeTransaction(0)).to.be.revertedWith(
      'NotAMember',
    )
  })
})
