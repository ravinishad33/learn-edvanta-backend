const cloudinary = require('cloudinary').v2;



cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_SECRET_KEY
});

const uploadOnCloudinary = async (localFilePath, resourceType, folder) => {
    try {
        if (!localFilePath) return null;
        const response = await cloudinary.uploader.upload(localFilePath, {
            resource_type: resourceType,// "image" or "video"
            folder,
            use_filename: true,
            unique_filename: true
        });
        return response;
    } catch (error) {
        console.log("upload error", error)
        return null;
    }
}


const deleteFromCloudinary = async (publicId, resourceType = "image") => {
    try {
        if (!publicId) return null;

        const result = await cloudinary.uploader.destroy(publicId, {
            resource_type: resourceType // "image" or "video"
        });

        return result;
    } catch (error) {
        console.log("delete error", error);
        return null;
    }
};




const deleteMultipleFromCloudinary = async (publicIds = [], resourceType = "image") => {
    try {
        if (!publicIds.length) return null;

        const result = await cloudinary.api.delete_resources(publicIds, {
            resource_type: resourceType
        });

        return result;
    } catch (error) {
        console.log("bulk delete error", error);
        return null;
    }
};



module.exports = {
    uploadOnCloudinary,
    deleteFromCloudinary,
    deleteMultipleFromCloudinary
};