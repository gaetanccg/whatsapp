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

// Contacts management
export const listContacts = async (req, res) => {
    try {
        const user = await User.findById(req.user._id).populate('contacts', '-password');
        if (!user) return res.status(404).json({ message: 'User not found' });
        res.json(user.contacts || []);
    } catch (error) {
        console.error('List contacts error:', error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

export const addContact = async (req, res) => {
    try {
        const targetId = req.params.id;
        if (targetId === req.user._id.toString()) return res.status(400).json({ message: 'Cannot add yourself as contact' });

        const user = await User.findById(req.user._id);
        const target = await User.findById(targetId);

        if (!user || !target) return res.status(404).json({ message: 'User not found' });

        // check if blocked
        if (user.blocked.includes(target._id)) {
            return res.status(400).json({ message: 'Cannot add a blocked user' });
        }

        if (user.contacts.includes(target._id)) {
            return res.status(400).json({ message: 'Contact already added' });
        }

        user.contacts.push(target._id);
        await user.save();

        res.json({ message: 'Contact added' });
    } catch (error) {
        console.error('Add contact error:', error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

export const removeContact = async (req, res) => {
    try {
        const targetId = req.params.id;
        const user = await User.findById(req.user._id);
        if (!user) return res.status(404).json({ message: 'User not found' });

        const idx = user.contacts.findIndex(c => c.toString() === targetId);
        if (idx === -1) return res.status(404).json({ message: 'Contact not found' });

        user.contacts.splice(idx, 1);
        await user.save();

        res.json({ message: 'Contact removed' });
    } catch (error) {
        console.error('Remove contact error:', error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

export const blockContact = async (req, res) => {
    try {
        const targetId = req.params.id;
        if (targetId === req.user._id.toString()) return res.status(400).json({ message: 'Cannot block yourself' });

        const user = await User.findById(req.user._id);
        const target = await User.findById(targetId);
        if (!user || !target) return res.status(404).json({ message: 'User not found' });

        if (user.blocked.includes(target._id)) return res.status(400).json({ message: 'User already blocked' });

        // remove from contacts if present
        user.contacts = user.contacts.filter(c => c.toString() !== targetId);

        user.blocked.push(target._id);
        await user.save();

        res.json({ message: 'User blocked' });
    } catch (error) {
        console.error('Block contact error:', error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

export const unblockContact = async (req, res) => {
    try {
        const targetId = req.params.id;
        const user = await User.findById(req.user._id);
        if (!user) return res.status(404).json({ message: 'User not found' });

        const idx = user.blocked.findIndex(b => b.toString() === targetId);
        if (idx === -1) return res.status(404).json({ message: 'Blocked user not found' });

        user.blocked.splice(idx, 1);
        await user.save();

        res.json({ message: 'User unblocked' });
    } catch (error) {
        console.error('Unblock contact error:', error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};
