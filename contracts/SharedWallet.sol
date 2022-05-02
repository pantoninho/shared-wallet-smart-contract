//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.0;

/// @title Simple Shared Wallet
/// @notice A wallet to be shared by multiple members. members may propose transactions that can only be executed after a required amount of approvals have been reached.
contract SharedWallet {
    struct Transaction {
        address requester;
        address payable to;
        uint256 value;
        address[] approvers;
        bool executed;
    }

    /// @notice a mapping representing wallet members. if value is true, address is a member
    mapping(address => bool) public members;
    /// @notice minimum number of approvals required for a transaction to be executed
    uint256 public requiredApprovals;
    /// @notice transactions (both executed and proposals)
    Transaction[] public transactions;

    /// @notice event emitted when a new transaction proposal has been submited
    event TransactionProposalSubmitted(uint256 index, Transaction transaction);
    /// @notice event emitted when a transaction has been executed
    event TransactionExecuted(uint256 index, Transaction transaction);

    error NotAMember();
    error NotAllowed();
    error NotEnoughApprovals();
    error TransactionAlreadyExecuted();
    error TransactionNotFound();
    error TransactionNotApproved();
    error TransactionAlreadyApproved();
    error SelfApprovalNotAllowed();

    modifier onlyMember() {
        if (members[msg.sender] != true) {
            revert NotAMember();
        }
        _;
    }

    /// @param _members deployed shared wallet member addresses
    /// @param _requiredApprovals number of approvals required for a transaction to be executed
    constructor(address[] memory _members, uint256 _requiredApprovals) {
        // add owner as wallet member
        members[msg.sender] = true;

        // add desired members
        for (uint256 i = 0; i < _members.length; i++) {
            members[_members[i]] = true;
        }

        requiredApprovals = _requiredApprovals;
    }

    receive() external payable {}

    /// @notice propose a transaction of value
    /// @param to transaction beneficiary address
    function proposeTransaction(address payable to) public payable onlyMember {
        address[] memory approvers;

        Transaction memory transaction = Transaction({
            to: to,
            requester: msg.sender,
            value: msg.value,
            approvers: approvers,
            executed: false
        });

        transactions.push(transaction);

        emit TransactionProposalSubmitted(transactions.length - 1, transaction);
    }

    /// @notice approve a transaction
    /// @param transactionIndex index of the transaction to approve
    function approveTransaction(uint256 transactionIndex) public onlyMember {
        if (transactionIndex >= transactions.length) {
            revert TransactionNotFound();
        }

        // check if this transaction is already approved by this member
        Transaction storage transaction = transactions[transactionIndex];

        if (msg.sender == transaction.requester) {
            revert SelfApprovalNotAllowed();
        }

        if (hasApproved(transaction, msg.sender)) {
            revert TransactionAlreadyApproved();
        }

        if (transaction.executed) {
            revert TransactionAlreadyExecuted();
        }

        transaction.approvers.push(msg.sender);
    }

    /// @notice execute a transaction. may only be called by the transaction requester
    /// @param transactionIndex index of the transaction to execute
    function executeTransaction(uint256 transactionIndex) public onlyMember {
        if (transactionIndex >= transactions.length) {
            revert TransactionNotFound();
        }

        Transaction storage transaction = transactions[transactionIndex];

        // only the transaction requester may execute it
        if (msg.sender != transaction.requester) {
            revert NotAllowed();
        }

        if (getApprovalCount(transactionIndex) < requiredApprovals) {
            revert NotEnoughApprovals();
        }

        if (transaction.executed == true) {
            revert TransactionAlreadyExecuted();
        }

        transaction.executed = true;
        transaction.to.transfer(transaction.value);
        emit TransactionExecuted(transactionIndex, transaction);
    }

    /// @notice revoke a transaction approval
    /// @param transactionIndex index of the transaction to execute
    function revokeTransaction(uint256 transactionIndex) public onlyMember {
        if (transactionIndex >= transactions.length) {
            revert TransactionNotFound();
        }

        Transaction storage transaction = transactions[transactionIndex];

        if (transaction.executed == true) {
            revert TransactionAlreadyExecuted();
        }

        bool found;
        uint256 approvalIndex;

        // find approver index and use it to remove it from the approver array
        for (uint256 i = 0; i < transaction.approvers.length; i++) {
            address approval = transaction.approvers[i];
            if (approval == msg.sender) {
                approvalIndex = i;
                found = true;
            }
        }

        if (!found) {
            revert TransactionNotApproved();
        }

        // use index to remove the approver
        // remove item from array by copying last item ref to desired index and pop last item
        transaction.approvers[approvalIndex] = transaction.approvers[transaction.approvers.length - 1];
        transaction.approvers.pop();
    }

    /// @notice gets the number of approvals of a transaction
    /// @param transactionIndex index of the transaction
    function getApprovalCount(uint256 transactionIndex) public view returns (uint256 approvalCount) {
        return transactions[transactionIndex].approvers.length;
    }

    /// @notice finds out if a transaction has been approved by a member
    /// @param transaction the transaction
    /// @param member the member
    function hasApproved(Transaction memory transaction, address member) private pure returns (bool) {
        for (uint256 i = 0; i < transaction.approvers.length; i++) {
            address approval = transaction.approvers[i];
            if (approval == member) {
                return true;
            }
        }

        return false;
    }
}
