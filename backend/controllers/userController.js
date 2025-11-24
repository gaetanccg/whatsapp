import User from '../models/User.js';

export const getAllUsers = async(req, res) => {
    try {
        const users = await User.find({_id: {$ne: req.user._id}})
                                .select('-password')
                                .sort({username: 1});

        res.json(users);
    } catch (error) {
        console.error('Get all users error:', error);
        res.status(500)
           .json({
               message: 'Server error',
               error: error.message
           });
    }
};

export const getUserById = async(req, res) => {
    try {
        const user = await User.findById(req.params.id).select('-password');

        if (!user) {
            return res.status(404).json({message: 'User not found'});
        }

        res.json(user);
    } catch (error) {
        console.error('Get user by id error:', error);
        res.status(500)
           .json({
               message: 'Server error',
               error: error.message
           });
    }
};

export const searchUsers = async(req, res) => {
    try {
        const {query} = req.query;

        if (!query) {
            return res.status(400).json({message: 'Search query is required'});
        }

        const users = await User.find({
            _id: {$ne: req.user._id},
            $or: [
                {
                    username: {
                        $regex: query,
                        $options: 'i'
                    }
                },
                {
                    email: {
                        $regex: query,
                        $options: 'i'
                    }
                }
            ]
        }).select('-password').limit(10);

        res.json(users);
    } catch (error) {
        console.error('Search users error:', error);
        res.status(500)
           .json({
               message: 'Server error',
               error: error.message
           });
    }
};

// New profile-related controllers
export const getProfile = async(req, res) => {
    try {
        const user = await User.findById(req.user._id).select('-password');
        if (!user) return res.status(404).json({message: 'User not found'});
        res.json(user);
    } catch (error) {
        console.error('Get profile error:', error);
        res.status(500)
           .json({
               message: 'Server error',
               error: error.message
           });
    }
};

export const updateProfile = async(req, res) => {
    try {
        const {
            username,
            email,
            password,
            avatar,
            status
        } = req.body;
        const user = await User.findById(req.user._id);
        if (!user) return res.status(404).json({message: 'User not found'});

        if (username) user.username = username;
        if (email) user.email = email;
        if (password) user.password = password; // will be hashed by pre-save hook
        if (avatar !== undefined) user.avatar = avatar; // can be null to remove
        if (status !== undefined) user.status = status;

        await user.save();

        const updated = await User.findById(req.user._id).select('-password');
        res.json(updated);
    } catch (error) {
        console.error('Update profile error:', error);
        // handle duplicate key error for unique fields
        if (error.code === 11000) {
            return res.status(400).json({message: 'Username or email already in use'});
        }
        res.status(500)
           .json({
               message: 'Server error',
               error: error.message
           });
    }
};

export const deleteProfile = async(req, res) => {
    try {
        await User.findByIdAndDelete(req.user._id);
        res.json({message: 'User deleted'});
    } catch (error) {
        console.error('Delete profile error:', error);
        res.status(500)
           .json({
               message: 'Server error',
               error: error.message
           });
    }
};
