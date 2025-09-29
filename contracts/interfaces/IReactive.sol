// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

interface IReactive {
    event Subscribe(
        uint256 indexed chainid,
        address indexed _contract,
        uint256 indexed topic_0,
        uint256 topic_1,
        uint256 topic_2,
        uint256 topic_3
    );

    event Unsubscribe(
        uint256 indexed chainid,
        address indexed _contract,
        uint256 indexed topic_0,
        uint256 topic_1,
        uint256 topic_2,
        uint256 topic_3
    );

    event Callback(
        uint256 indexed chainid,
        address indexed _contract,
        uint64 indexed gas_limit,
        bytes calldata payload
    );

    function subscribe(
        uint256 chainid,
        address _contract,
        uint256 topic_0,
        uint256 topic_1,
        uint256 topic_2,
        uint256 topic_3
    ) external;

    function unsubscribe(
        uint256 chainid,
        address _contract,
        uint256 topic_0,
        uint256 topic_1,
        uint256 topic_2,
        uint256 topic_3
    ) external;

    function emit_callback(
        uint256 chainid,
        address _contract,
        uint64 gas_limit,
        bytes calldata payload
    ) external;
}