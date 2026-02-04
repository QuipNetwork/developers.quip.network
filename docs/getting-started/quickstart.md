---
icon: bullseye-arrow
---

# Quickstart

The Quip protocol is published as open source software on [GitHub](https://github.com/quipnetwork/quip-protocol). If you wish to run a node, you can follow these steps:

1. To run, please add port 20049 to your router's UDP forwarding
2.  change `your-public-ip` below, and run this docker image:<br>

    ```
    docker run -d --pull always --name quip-cpu \
      -v ~/quip-data:/data \
      -e QUIP_PUBLIC_HOST=your-public-ip:20049 \
      -p 20049:20049/udp -p 20049:20049/tcp \
      carback1/quip-network-node-cpu:latest
    ```
3.  You can then watch the logs of the image by running the following:<br>

    ```
    docker logs quip-cpu -f
    ```

Congrats you are now downloading the blockchain and mining on the network! Right now there's not much to do other than generate some quantum-resistant keys through our wallets on Ethereum, Solana, their L2s, and the Bitcoin L2s Arch and Midl, but we are building out the smart contract layer so you can take advantage of the quantum computers too!

You can generate post-quantum keys to prepare for the smart contract layer by using our wallets at [vault.quip.network](https://vault.quip.network/) or you can use the libraries below.

If you want to understand the structure of what we're building, here's some key diagrams below:

<figure><img src="../.gitbook/assets/stakeholder-categories-2.png" alt=""><figcaption><p>The structure of the Quip Network</p></figcaption></figure>

<figure><img src="../.gitbook/assets/quip_whitepaper_consensus.png" alt=""><figcaption><p>Quip Network interactions with other chains</p></figcaption></figure>

<figure><img src="../.gitbook/assets/image.png" alt=""><figcaption><p>The QUIP Lifecycle</p></figcaption></figure>

Quip's implementation of various hash algorithms, especially the preferred Winternitz One-Time Signature (WOTS+), is available as a library for [rust](https://crates.io/crates/hashsigs-rs), [c++](https://github.com/quipnetwork/hashsigs-cpp), [typescript](https://www.npmjs.com/package/@quip.network/hashsigs), and [solidity](https://www.npmjs.com/package/@quip.network/hashsigs-solidity). If you do not want to use these libraries directly, you can use the interface at [vault.quip.network](https://vault.quip.network/).

All Quip Network libraries and contracts are available at our [Github](https://github.com/QuipNetwork).

More coming soon

{% hint style="info" %}
Want to learn more about QUIPs from scratch? Head to the [Basics](broken-reference/) section to learn more.
{% endhint %}
