'use strict';

const {Contract} = require('fabric-contract-api');

/**
 * @description Smart contract for Users Organization
 */
class PropRegUsersContract extends Contract {

	/**
	 * @description Constructor method to initiate contract with unique name in the network
	 */
	constructor() {
		// Name of the smart contract
		super('org.property-registration-network.regnet.users');
	}

	/**
	 * @description instantiate the smart contract
	 * @param {*} ctx The transaction context object
	 */
	async instantiate(ctx) {
		console.log('Smart Contract for User Instantiated');
	}

	/**
	 * @description Request from user to register on the network
	 * @param {*} ctx The transaction context object
	 * @param {*} name Name of the user
	 * @param {*} email Email ID of the user
	 * @param {*} phoneNumber Phone number of the user
	 * @param {*} aadharId Aadhar Id of the user
	 * @returns Returns user request object
	 */
	async requestNewUser(ctx, name, email, phoneNumber, aadharId) {

		// Create a new composite key for the new student account
		const userKey = ctx.stub.createCompositeKey('org.property-registration-network.regnet.users', [name,aadharId]);

		// Create a student object to be stored in blockchain
		let newUserObject = {
			name: name,
			email: email,
			phoneNumber: phoneNumber,
			aadharId: aadharId,
			userId: ctx.clientIdentity.getID(),
			createdAt: new Date(),
			updatedAt: new Date(),
		};

		// Convert the JSON object to a buffer and send it to blockchain for storage
		let dataBuffer = Buffer.from(JSON.stringify(newUserObject));
		await ctx.stub.putState(userKey, dataBuffer);

		// Return value of new account created to user
		return newUserObject;
	}

	/**
	 * @description Method to recharge the account with the upgradCoins.  Here the coin is retrieved from the bankTransactionId sent in the arguement
	 * @param {*} ctx  The transaction context object
	 * @param {*} name Name of the user
	 * @param {*} aadharId  Aadhar Id of the user
	 * @param {*} bankTransactionId mocked bank transaction id for this project
	 * @returns Updated user detail in the network
	 */
	async rechargeAccount(ctx, name, aadharId, bankTransactionId){

		// Bank Transaction ID	with Number of upgradCoins
		let bankTxIdArray = [{'id':'upg500', 'value':500}, {'id':'upg1000', 'value':1000}, {'id':'upg1500', 'value':1500}];

		//Fetch upgradCoins based on the bank transaction id
		let txnDetails ;
		for (var i=0; i < bankTxIdArray.length; i++) {
			if (bankTxIdArray[i].id === bankTransactionId) {
				txnDetails = bankTxIdArray[i];
			}
    	}

		//create composite key for the users
		const userKey = ctx.stub.createCompositeKey('org.property-registration-network.regnet.users', [name, aadharId]);

		//using composite key fetch the current state of user object
		let userBuffer = await ctx.stub
				.getState(userKey)
				.catch(err => console.log(err));


		//validate bankTransactionId with the expected value and if the user found in the network
		if(txnDetails && userBuffer){

			//Update user object with new properties
			let userObject = JSON.parse(userBuffer.toString());
			if(userObject.status === 'Approved'){
				userObject.upgradCoins = userObject.upgradCoins + txnDetails.value;
				userObject.updatedAt = new Date();

				// Convert the JSON object to a buffer and send it to blockchain for storage
				let dataBuffer = Buffer.from(JSON.stringify(userObject));
				await ctx.stub.putState(userKey, dataBuffer);

				// Return value of updated  user object
				return userObject;

			}
			else{ //Decline the transaction if user is not registered in the network
				throw new Error('User should be registered in the network to recharge account');
			}
		}
		else{ //Decline the transaction if bank transaction id is invalid
			throw new Error('Invalid Transaction ID: ' + bankTransactionId );
		}
	}

	/**
	 * @description View user details in the network
	 * @param {*} ctx The transaction context object
	 * @param {*} name Name of the user
	 * @param {*} aadharId Aadhar Id of the user
	 * @returns User object in the network if found, otherwise throws error
	 */
	async viewUser(ctx, name, aadharId){
		//create composite key for the user
		const userKey = ctx.stub.createCompositeKey('org.property-registration-network.regnet.users', [name, aadharId]);


		//using composite key fetch the current state of user object and return
		let userBuffer = await ctx.stub
				.getState(userKey)
				.catch(err => console.log(err));

		if(userBuffer){
			//user object in the network
			let userObject = JSON.parse(userBuffer.toString());
			return userObject;

		}
		else{
			throw new Error('User is not available in the network, please cross check the detail');
		}
	}

	/**
	 * @description Method to request to user's property to be registered in the network.
	 * @param {*} ctx The transaction context object
	 * @param {*} propertyId Unique property id of the property
	 * @param {*} price Price of the property
	 * @param {*} name Name of the user (owner) who want to register their property in the network
	 * @param {*} aadharId Aadhar id of the user (owner) who want to register their property in the network
	 * @returns Propety request object
	 */
	async propertyRegistrationRequest(ctx, propertyId, price, name, aadharId){

		//create composite key for the user detail given
		const userKey = ctx.stub.createCompositeKey('org.property-registration-network.regnet.users', [name, aadharId]);

		//fetch the user details from the ledger using composite key fetch the current state of user object and return
		let userBuffer = await ctx.stub
				.getState(userKey)
				.catch(err => console.log(err));

		let userObject = JSON.parse(userBuffer.toString());

		//if user is registered in the network, then proceed, otherwise, decline the transaction
		if(userObject.status === 'Approved'){
			//user is valid, then register the property request in the ledger.
			//Use name, aadharId, and propertyId to create new composite key for property
			const propertyKey = ctx.stub.createCompositeKey('org.property-registration-network.regnet.users.property', [propertyId]);

			// Create a property object to be stored in blockchain
			let propertyObject = {
				propertyId: propertyId,
				owner: name+"-"+aadharId,
				price: price,
				createdAt: new Date(),
				updatedAt: new Date(),
			};

			// Convert the JSON object to a buffer and send it to blockchain for storage
			let propertyDataBuffer = Buffer.from(JSON.stringify(propertyObject));
			await ctx.stub.putState(propertyKey, propertyDataBuffer);

			// Return value of new property request requested by the user
			return propertyObject;
		}
		else{
			throw new Error('User is not registered in the network');
		}
	}

	/**
	 * @description View property details
	 * @param {*} ctx The transaction context object
	 * @param {*} propertyId Unique property id of the property
	 */
	async viewProperty(ctx, propertyId){

		//create composite key for the details given property id
		const propertyKey = ctx.stub.createCompositeKey('org.property-registration-network.regnet.users.property', [propertyId]);

		//using composite key fetch the current state of property object and return
		let propertyBuffer = await ctx.stub
				.getState(propertyKey)
				.catch(err => console.log(err));
		if(propertyBuffer){
			let propertyObject = JSON.parse(propertyBuffer.toString());
			return propertyObject;
		}
		else{
			throw new Error('Property is not found in the network');
		}
	}

	/**
	 * @description Method to update property status
	 * @param {*} ctx The transaction context object
	 * @param {*} propertyId Unique property id of the property
	 * @param {*} name Name of the user who owns the property in the network
	 * @param {*} aadharId Aadhar id of the user who owns the property in the network
	 * @param {*} propertyStatus Property status to be updated
	 */

	 async updateProperty(ctx, propertyId, name, aadharId, status) {
	     //to chekc if only users peer are used to interact with this function
	     if (ctx.clientIdentity.getMSPID() != "usersMSP") {
	       return "Users should be used to Update property details";
	     }
	     //creating composite key for approved user and approved Property
	     const approvedUserKey = ctx.stub.createCompositeKey('org.property-registration-network.regnet.approvedUser', [name + '-' + aadharId]);

	     const approvedPropertyKey = ctx.stub.createCompositeKey('org.property-registration-network.regnet.approvedPropertyKey', [propertyId]);



	     let propertyBuffer = await ctx.stub.getState(approvedPropertyKey).catch(err => console.log(err));

	     try {
	       //checking if property exist, if not go to catch and return String
	       let propertyDetails = JSON.parse(propertyBuffer.toString());


	       //check if user who is trying to update the property details is actually the propety owner

	       if (propertyDetails.owner == approvedUserKey) {

	         //Make sure status can  only hold registered ot onSale, anyother value passed will lead to invalid status
	         if (status == "registered" || status == "onSale") {

	           propertyDetails.status = status;

	           let updatedPropertyBuffer = Buffer.from(JSON.stringify(propertyDetails));

	           await ctx.stub.putState(approvedPropertyKey, updatedPropertyBuffer);

	           return propertyDetails;

	         }

	         else {

	           return "Status passed to the function is neither registered nor onSale. Please re-enter status value again.";

	         }

	       }

	       else {

	         return "This user is not the owner of the property";

	       }

	     }

	     catch (err) {

	       return "Property either doesn't exist or not approved on the network";

	     }
	   }

	   /**

	  * purchase property

	  * @param ctx - The transaction context object

	  * @param propertyId - unique ID

	  * @param name - Name of the user

	  * @param Aadhar - Aadhar number of the user

	  * @return - returns 3 object : New onwer object, old Owner object and Updated property object

	  */

	   async purchaseProperty(ctx, propertyId, name, aadharId) {
	     //to chekc if only users peer are used to interact with this function
	     if (ctx.clientIdentity.getMSPID() != "usersMSP") {
	       return "Users should be used to purchase a property";
	     }
	     //creating 2 composite key for approved property and approved user (User who wish to buy the property)
	     const approvedPropertyKey = ctx.stub.createCompositeKey('org.property-registration-network.regnet.approvedPropertyKey', [propertyId]);

	     const approvedUserKey = ctx.stub.createCompositeKey('org.property-registration-network.regnet.approvedUser', [name + '-' + aadharId]);



	     let propertyBuffer = await ctx.stub.getState(approvedPropertyKey).catch(err => console.log(err));

	     try {
	       //check if the property is approved and is in the network
	       //if not go to the outer catch block and return "property doesn't exist"
	       let propertyDetails = JSON.parse(propertyBuffer.toString());

	       //checking if the property can be sold or not? can only be sold if status = onSale.
	       if (propertyDetails.status == "onSale") {

	         let approvedUserBuffer = await ctx.stub.getState(approvedUserKey).catch(err => console.log(err));

	         try {
	           //checking if the approvedUser(User who wish to buy) is approved on the network
	           let approvedUserData = JSON.parse(approvedUserBuffer.toString());

	           //checking if user who wish to buy have enough upGrad coins to buy the property
	           if (approvedUserData.upGradCoins >= propertyDetails.price) {

	             const orignalPropertyOwnerKey = propertyDetails.owner;

	             let orignalPropertyOwnerBuffer = await ctx.stub.getState(orignalPropertyOwnerKey).catch(err => console.log(err));

	             let orignalPropertyOwnerData = JSON.parse(orignalPropertyOwnerBuffer.toString());

	             //checking if the owner of the property is trying to buy the same property again
	             //user who wish to buy != owner of the property
	             if (orignalPropertyOwnerKey != approvedUserKey) {

	               orignalPropertyOwnerData.upGradCoins = +(orignalPropertyOwnerData.upGradCoins) + +(propertyDetails.price);

	               approvedUserData.upGradCoins -= propertyDetails.price;


	               //updating the new owner details and changing the status of the property to registered
	               propertyDetails.owner = approvedUserKey;

	               propertyDetails.status = "registered";


	               //pushing the updated owner details on the ledger
	               let newOwnerBuffer = Buffer.from(JSON.stringify(approvedUserData));

	               await ctx.stub.putState(approvedUserKey, newOwnerBuffer);



	               //pushing the updated owner details on the ledger
	               let orignalOwnerUpdatedBuffer = Buffer.from(JSON.stringify(orignalPropertyOwnerData));

	               await ctx.stub.putState(orignalPropertyOwnerKey, orignalOwnerUpdatedBuffer);



	               //pushing the updated property details on the ledger
	               let propertyUpdateBuffer = Buffer.from(JSON.stringify(propertyDetails));

	               await ctx.stub.putState(approvedPropertyKey, propertyUpdateBuffer);


	               //returning old, new and updated property details
	               return "OldOwner Updated Detail  " + orignalOwnerUpdatedBuffer + "                            NewOwner Updated Details " + newOwnerBuffer + "                         Updated Property Details " + propertyUpdateBuffer;

	             }

	             else {

	               return "You already own this Property";

	             }

	           }

	           else {

	             return "You do not have enough upGradCoins to buy this property, Recharge your account";

	           }

	         }

	         catch (err) {

	           return "The user either doesn't exist or is not approved";

	         }

	       }

	       else {

	         return "Property is not for SALE.";

	       }

	     }



	     catch (err) {

	       return "Property either doesn't exist or is not approved.";

	     }

	   }



















	
}

module.exports = PropRegUsersContract;
