import {createJWT} from "../Utils/tokenUtil.js";
import { Restaurant, Admin, Member, Partner, Owner} from "../Models/schema.js";
import {hashPassword, comparePassword} from "../Utils/passwordUtil.js";
import { Types } from 'mongoose';
export const Login = async(req,res)=>{
    try{
        const{email,password}=req.body;
        const user = await Member.findOne({email});
        if(!user){
            return res.status(401).send({message: "Invalid emailID"});
        }
        const validPassword = await comparePassword(password, user.password);
    if (!validPassword) {
      return res.status(401).send({message: "Invalid password"});
    }
    const token = createJWT({
      email: user.email,
      userId:user._id
    });
    res.status(200).send({token, message: "Login Succesfull!"});
    }catch(error){
        console.error("Error logging in:", error);
    res.status(500).json({message: "Internal server error"});
    }

}
export const Registration = async(req,res)=>{
    try{
        const {name,email,password,confirm_password,location}=req.body;
        const user = await Member.findOne({email});
        if(user){
            return res.status(400).send({message:"email is already exists"});

        }
        if (password !== confirm_password) {
            return res.status(400).json({ message: "Passwords do not match" });
        }
        const hashedPassword = await hashPassword(password);
        const newUser = await Member.create({
            name,
            email,
            password: hashedPassword,
            location
            
          });
          const token = createJWT({
            name: newUser.name,
            email: newUser.email,
            password: newUser.password,
            location:newUser.location
          });
          console.log(token);
    res.status(200).json({token, message: "User registered successfully"});

    }catch(error){
        console.error("Error registering user:", error);
        res.status(500).json({message: "Internal server error"})

    }
    
}
export const Worker = async(req,res)=>{
    const {email,password,role}=req.body;
    if(role ==="Admin"){
        try {
       
            const user = await Admin.findOne({email}).select('-password');
    
            if (!user) {
                return res.status(404).json({ message: "User not found" });
            }
    
            res.status(200).json({ user });
        } catch (error) {
            console.error("Error fetching user data:", error);
            res.status(500).json({ message: "Internal server error" });
        }

    }else if(role ==="delivery partner"){
        try {
       
            const user = await Partner.findOne({email}).select('-password');
    
            if (!user) {
                return res.status(404).json({ message: "User not found" });
            }
    
            res.status(200).json({ user });
        } catch (error) {
            console.error("Error fetching user data:", error);
            res.status(500).json({ message: "Internal server error" });
        }

    }else if(role === "Restaurant Owner"){
        try {
       
            const user = await Owner.findOne({email}).select('-password');
            console.log(user)
    
            if (!user) {
                return res.status(404).json({ message: "User not found" });
            }
    
            res.status(200).json({ user });
        } catch (error) {
            console.error("Error fetching user data:", error);
            res.status(500).json({ message: "Internal server error" });
        }
}
}

export const Main=async(req,res)=>{
    try{
        const New=await Restaurant.find({});
        if(New){
            res.json(New)
        }else{
            res.send("No Restaurant Availabe")
        }
    }catch(error){
        res.status(500).send(error.message);
    }

}
export const GetUser = async (req, res) => {
    try {
       
        const user = await Member.findOne({_id:req.userId}).select('-password');

        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }

        res.status(200).json({ user });
    } catch (error) {
        console.error("Error fetching user data:", error);
        res.status(500).json({ message: "Internal server error" });
    }
}
export const UpdateUser =async(req,res)=>{
    const userId = req.params.id;
    const updataData = req.body;
    const updatedUser = await Member.findByIdAndUpdate(userId,updataData, { new: true });

        res.json(updatedUser);
}
export const UpdateOrder = async (req, res) => {
    try {
        const { email, order_item } = req.body;

        
        const restaurantNames = order_item.map(item => item.restaurant_name);

    
        for (const name of restaurantNames) {
            
            const restaurant = await Restaurant.findOne({ restaurant_name: name });
            
            if (restaurant) {
               
                const restaurantLocation = restaurant.location;
                console.log(`Restaurant ${name} is located in ${restaurantLocation}`);
                
              
                const matchingDeliveryPartners = await Partner.find({ location: restaurantLocation });
                for (const partner of matchingDeliveryPartners) {
               
                    const filteredOrderItems = order_item.filter(item => item.restaurant_name === name)
                        .map(item => ({ ...item, location: restaurantLocation }));
                    partner.view_orders.push(...filteredOrderItems);
                    await partner.save();
                }
                const admins = await Admin.find();
                for (const admin of admins) {
                    
                    const filteredOrderItems = order_item.filter(item => item.restaurant_name === name)
                        .map(item => ({ ...item, location: restaurantLocation }));
                    admin.view_orders.push(...filteredOrderItems);
                    await admin.save();
                }
                const user = await Member.findOne({ email });
                if (!user) {
                    return res.status(404).json({ message: "User not found" });
                }
                const filteredOrderItems = order_item.filter(item => item.restaurant_name === name)
                    .map(item => ({ ...item, location: restaurantLocation }));
                
                user.order_item.push(...filteredOrderItems);
                await user.save();
            } else {
                console.log(`Restaurant ${name} not found`);
                
            }
        }
        
        res.status(200).json({ message: "Orders updated successfully" });
    } catch (error) {
        console.error("Error updating order:", error);
        res.status(500).json({ message: "Internal server error" });
    }
};

export const BucketList = async (req, res) => {
    try {
        const { email } = req.body;

        const user = await Member.findOne({ email });

        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }
        console.log(user.bucket_list)

        res.status(200).json({ bucketList: user.bucket_list });
    } catch (error) {
        console.error("Error fetching user data:", error);
        res.status(500).json({ message: "Internal server error" });
    }
}
export const ClearBucketList = async (req, res) => {
    try {
      const userId = req.userId;
  
      const user = await Member.findByIdAndUpdate(
        userId,
        { $set: { bucket_list: [] } },
        { new: true }
      );
  
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
  
      res.status(200).json({ message: "Bucket list cleared successfully", user });
    } catch (error) {
      console.error("Error clearing bucket list:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  };


  export const RemoveDishBucketList = async (req, res) => {
    try {
      const userId = req.userId; 
      const { dishName } = req.params; 
      console.log(dishName)
      
      const user = await Member.findById(userId);
  
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
  
      const indexToRemove = user.bucket_list.findIndex(item => item.dishes.some(dish => dish.dish_name === dishName));
  
      if (indexToRemove === -1) {
        return res.status(404).json({ message: "Item not found in the bucket list" });
      }
  
      console.log("Dish name to remove:", dishName);
      user.bucket_list.splice(indexToRemove, 1);
      await user.save();
  
      res.status(200).json({ message: "Item removed from the bucket list successfully", user });
    } catch (error) {
      console.error("Error removing item from bucket list:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  }
  
  export const ReceivedOrders = async (req, res) => {
    try {
        const { email } =  req.query;

        const deliveryPartner = await Partner.findOne({ email });

        if (!deliveryPartner) {
            return res.status(404).json({ message: "Delivery partner not found" });
        }

        res.status(200).json(deliveryPartner);
    } catch (error) {
        console.error("Error fetching delivery partner data:", error);
        res.status(500).json({ message: "Internal server error" });
    }
};
export const UpdateOrders = async (req, res) => {
    try {
        const { orders } = req.body;
        console.log(orders)

        // Update orders for delivery partners
        for (const order of orders) {
            const updatedPartner = await Partner.findOneAndUpdate(
                { 'view_orders._id': order._id },
                { $set: { 'view_orders.$.track_down': order.track_down },
                'view_orders.$.order_status': order.order_status }, 
                { new: true }
            );
            if (!updatedPartner) {
                return res.status(404).json({ error: `Delivery partner with order ID ${order._id} not found` });
            }
        }
        const adminFilter = {
            'view_orders.username': { $exists: true }, 
            'view_orders.dish_name': { $exists: true },
            'view_orders.restaurant_name': { $exists: true }
        };

        const adminUpdate = {
            $set: {
                'view_orders.$[elem].track_down': orders[0].track_down, 
                'view_orders.$[elem].dish_name': orders[0].dish_name, 
                'view_orders.$[elem].restaurant_name': orders[0].restaurant_name,
                'view_orders.$[elem].order_status': orders[0].order_status
            }
        };

        const adminOptions = {
            arrayFilters: [{ 'elem.username': { $exists: true } }]
        };

        await Admin.updateMany(adminFilter, adminUpdate, adminOptions);

        // Update orders for members
        for (const order of orders) {
            const filter = { name: order.username };

            const existingEntry = await Member.findOne(filter);

            if (existingEntry) {
                const existingIndex = existingEntry.track_down.findIndex(entry => entry.restaurantname === order.restaurant_name && entry.dishname === order.dish_name);

                if (existingIndex !== -1) {
                    existingEntry.track_down[existingIndex].orderstatus = order.order_status;
                    existingEntry.track_down[existingIndex].trackdown = order.track_down;
                } else {
                    // If entry does not exist, add it
                    existingEntry.track_down.push({
                        restaurantname: order.restaurant_name,
                        dishname: order.dish_name,
                        trackdown: order.track_down,
                        orderstatus: order.order_status
                    });
                }

                await existingEntry.save();
            } else {
                return res.status(404).json({ error: `Member with name ${order.username} not found` });
            }
        }

        res.status(200).json({ message: 'Orders updated successfully' });
    } catch (error) {
        console.error('Error updating orders:', error);
        res.status(500).json({ error: 'An error occurred while updating orders' });
    }
};


export const AdminViewUsers=async(req,res)=>{
    try {
        const users = await Member.find();
        res.status(200).json(users);
    } catch (error) {
        console.error('Error fetching user details:', error);
        res.status(500).json({ error: 'An error occurred while fetching user details' });
    }
}
export const AdminUserOrders=async (req, res) => {
    try {
      const admin = await Admin.findOne({ role: 'Admin' });
      if (!admin) {
        return res.status(404).json({ message: 'Admin not found' });
      }
      res.status(200).json({ view_orders: admin.view_orders });
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: 'Server Error' });
    }
  };
export const DeleteTrackDown=async (req, res) => {
    try {
        const { userName, restaurantName, dishName, orderStatus, trackDown } = req.body;

        console.log(userName)
        const user = await Member.findOne({ name: userName });
        console.log(user)
        if (!user) {
            return res.status(404).json({ error: "User not found" });
        }
        const trackDownIndex = user.track_down.findIndex(entry => (
            entry.restaurantname === restaurantName &&
            entry.dishname === dishName &&
            entry.orderstatus === orderStatus &&
            entry.trackdown === trackDown
        ));

        if (trackDownIndex !== -1) {
            user.track_down.splice(trackDownIndex, 1);
            await user.save();
            console.log("updated")
        } else {
            return res.status(404).json({ error: "Trackdown entry not found for the given parameters" });
        }

        res.status(200).json({ message: "Trackdown entry deleted successfully" });
    } catch (error) {
        console.error("Error deleting trackdown data:", error);
        res.status(500).json({ error: "An error occurred while deleting trackdown data" });
    }
};
 
export const saveIssues = async (req, res) => {
    try {
        const { email, availability, username, restaurant, issue } = req.body;
        console.log(email)
        console.log(availability)
        console.log(username)
        const owner = await Owner.findOne({ name: username });
        console.log(owner)
        
        if (!owner) {
            return res.status(404).json({ error: 'Restaurant owner not found' });
        }
       
        if (availability) {
            if (availability !== 'open' && availability !== 'close') {
                return res.status(400).json({ error: 'Invalid availability value' });
            }
            owner.availability = availability;
        }
        
        if (username && restaurant && issue) {
            
            owner.issues = issue;
        }
    
        
        await owner.save();
        const updaterestaurant = await Restaurant.findOneAndUpdate(
            { restaurant_name: restaurant },
            { availability: availability },
            { new: true }
        );
        await updaterestaurant.save();
        res.status(200).json({ message: 'Owner details updated successfully' });
    } catch (error) {
        console.error('Error updating owner details:', error);
        res.status(500).json({ error: 'An error occurred while updating owner details' });
    }
};
export const OwnerDetails=async (req, res) => {
    try {
        const { email } = req.query;
        const owner = await Owner.findOne({ email });

        if (!owner) {
            return res.status(404).json({ error: "Owner not found" });

        }
        res.status(200).json(owner);
    } catch (error) {
        console.error("Error fetching owner details:", error);
        res.status(500).json({ error: "An error occurred while fetching owner details" });
    }
};
export const AdminIssues=async(req,res)=>{
    try {
 
        const owners = await Owner.find({});

      
        res.status(200).json(owners);
    } catch (error) {
        console.error('Error fetching availability and issues data:', error);
        res.status(500).json({ error: 'An error occurred while fetching availability and issues data' });
    }
};

