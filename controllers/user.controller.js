import Auth from "../models/auth.model.js";

const ALLOWED_ROLES = ["user", "admin", "superadmin"];

// Get current logged-in user
export const getCurrentUser = async (req, res) => {
  try {
    res.status(200).json({
      success: true,
      user: {
        id: req.user._id,
        fullName: req.user.fullName,
        email: req.user.email,
        role: req.user.role,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// Get all users
export const getAllUsers = async (req, res) => {
  try {
    const users = await Auth.find().select("-password").sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: users.length,
      users,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// Get a single user by ID
export const getUserById = async (req, res) => {
  try {
    const { id } = req.params;

    const user = await Auth.findById(id).select("-password");

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found.",
      });
    }

    res.status(200).json({
      success: true,
      user,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// Update a user's role
export const updateUserRole = async (req, res) => {
  try {
    const { id } = req.params;
    const { role } = req.body;

    if (!role || !ALLOWED_ROLES.includes(role)) {
      return res.status(400).json({
        success: false,
        message: `Role must be one of: ${ALLOWED_ROLES.join(", ")}.`,
      });
    }

    if (id === req.user._id.toString()) {
      return res.status(400).json({
        success: false,
        message: "You cannot change your own role.",
      });
    }

    const userToUpdate = await Auth.findById(id);

    if (!userToUpdate) {
      return res.status(404).json({
        success: false,
        message: "User not found.",
      });
    }

    // Don't allow demoting the last remaining superadmin.
    if (userToUpdate.role === "superadmin" && role !== "superadmin") {
      const superadminCount = await Auth.countDocuments({ role: "superadmin" });
      if (superadminCount <= 1) {
        return res.status(400).json({
          success: false,
          message: "Cannot demote the last remaining superadmin.",
        });
      }
    }

    userToUpdate.role = role;
    await userToUpdate.save();

    const { password, ...userWithoutPassword } = userToUpdate.toObject();

    res.status(200).json({
      success: true,
      message: "Role updated successfully.",
      user: userWithoutPassword,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// Delete a user
export const deleteUser = async (req, res) => {
  try {
    const { id } = req.params;

    if (id === req.user._id.toString()) {
      return res.status(400).json({
        success: false,
        message: "You cannot delete your own account.",
      });
    }

    const userToDelete = await Auth.findById(id);

    if (!userToDelete) {
      return res.status(404).json({
        success: false,
        message: "User not found.",
      });
    }

    if (userToDelete.role === "superadmin") {
      const superadminCount = await Auth.countDocuments({ role: "superadmin" });
      if (superadminCount <= 1) {
        return res.status(400).json({
          success: false,
          message: "Cannot delete the last remaining superadmin.",
        });
      }
    }

    await Auth.findByIdAndDelete(id);

    res.status(200).json({
      success: true,
      message: "User deleted successfully.",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};
