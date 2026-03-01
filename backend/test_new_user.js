require("dotenv").config();
const mongoose = require("./node_modules/mongoose");
const User = require("./src/models/User");
const hostfiWalletService = require("./src/services/hostfiWalletService");

async function run() {
    await mongoose.connect(process.env.MONGODB_URI);

    // Create dummy user
    const newUser = new User({
        firstName: "Test",
        lastName: "User",
        email: "test_mismatch2@example.com",
        password: "Password123!@#",
        role: "client"
    });
    await newUser.save();
    console.log("Created User:", newUser._id);

    // Initialize wallets
    await hostfiWalletService.initializeUserWallets(newUser._id);

    // Reload WITH select('+wallet.tsaraMnemonic')
    const loadedUser = await User.findById(newUser._id).select('+wallet.tsaraMnemonic +wallet.tsaraEncryptedPrivateKey');
    console.log("DB tsaraAddress:", loadedUser.wallet.tsaraAddress);

    // Decrypt
    const tsaraService = require("./src/services/tsaraService");
    const keypair = await tsaraService.getKeypairFromEncrypted(loadedUser.wallet.tsaraMnemonic);
    console.log("Decrypted Address:", keypair.publicKey.toBase58());

    // Cleanup
    await User.findByIdAndDelete(newUser._id);

    process.exit(0);
}
run();
