require("dotenv").config();
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
const BASE_URL_IMG = process.env.BASE_URL_IMG;

const uploadAlbum = async (req, res) => {
  try {
    if (req.method !== "POST") {
      return res.status(405).json({
        status: false,
        message: "Method Not Allowed",
      });
    }
    console.log("req.files", req.files);
    if (
      !req.files ||
      !req.files.albumImage ||
      req.files.albumImage.length === 0
    ) {
      return res.status(400).json({
        status: false,
        message: "No album images uploaded!",
      });
    }

    const { userId, id, title, day, dateTime, ownerName, status } = req.body;

    if (
      !title ||
      !day ||
      !dateTime ||
      !ownerName ||
      !userId ||
      status === undefined
    ) {
      return res
        .status(400)
        .json({ status: false, message: "Missing required fields" });
    }
    // Convert uploaded images into DB paths + public URLs
    const newAlbumImagesDB = req.files.albumImage.map((file) => {
      const relativePath = file.path.split("uploads")[1].replace(/\\/g, "/");
      return `/uploads${relativePath}`;
    });

    const newAlbumImagesPath = newAlbumImagesDB.map(
      (path) => `${BASE_URL_IMG}${path}`
    );

    let album;

    if (id) {
      // Update existing album (append images)
      album = await prisma.photoAlbum.findFirst({
        where: { id: Number(id) },
      });

      if (!album) {
        return res.status(404).json({
          status: false,
          message: "Album not found",
        });
      }

      // Merge old + new images
      const updatedImages = [...album.albumImage, ...newAlbumImagesDB];

      album = await prisma.photoAlbum.update({
        where: { id: Number(id) },
        data: {
          albumImage: updatedImages,
          createdOn: new Date(),
        },
      });
    } else {
      // Create new album
      const thumbnailDB = newAlbumImagesDB[0];
      album = await prisma.photoAlbum.create({
        data: {
          userId: Number(userId),
          title,
          thumbnail: thumbnailDB,
          day,
          dateTime,
          ownerName,
          albumImage: newAlbumImagesDB,
          status: status ? Number(status) : 1,
          createdOn: new Date(),
          userId: userId ? Number(userId) : null,
        },
      });
    }

    // Response with public URLs
    const responseData = {
      ...album,
      thumbnail: `${BASE_URL_IMG}${album.thumbnail}`,
      albumImage: album.albumImage.map((img) => `${BASE_URL_IMG}${img}`),
    };

    res.status(id ? 200 : 201).json({
      status: true,
      message: id
        ? "Images added to album successfully!"
        : "Album created successfully!",
      data: responseData,
    });
  } catch (error) {
    console.error("Upload Album Error:", error);
    res.status(500).json({
      status: false,
      message: error.message || "Internal Server Error",
    });
  }
};

const fetchAlbumList = async (req, res) => {
  try {
    if (req.method !== "POST") {
      return res.status(405).json({
        status: false,
        message: "Method Not Allowed",
      });
    }
    const { userId, roleId, status } = req.body;

    if (!roleId || !userId || status === undefined) {
      return res
        .status(400)
        .json({ status: false, message: "Missing required fields" });
    }
    // Check if user exists
    const user = await prisma.user.findFirst({
      where: { userId: Number(userId), roleId: Number(roleId) },
    });

    if (!user) {
      return res.status(401).json({
        status: false,
        message: "User not found",
      });
    }

    const albumList = await prisma.photoAlbum.findMany({
      where: { status: Number(status) },
      orderBy: { createdOn: "desc" },
      select: {
        id: true,
        title: true,
        thumbnail: true,
        day: true,
        dateTime: true,
        ownerName: true,
        status: true,
        createdOn: true,
      },
    });

    if (!albumList || albumList.length === 0) {
      return res.status(404).json({
        status: false,
        message: "No albums found",
      });
    }
    console.log("req.body", albumList);
    return res.status(200).json({
      status: true,
      message: "Album list fetched successfully",
      data: albumList.map((album) => ({
        ...album,
        thumbnail: `${BASE_URL_IMG}${album.thumbnail}`,
      })),
    });
  } catch (error) {
    res.status(400).json({
      status: false,
      message: error.message,
    });
  }
};
const fetchAlbumDetail = async (req, res) => {
  try {
    if (req.method !== "POST") {
      return res.status(405).json({
        status: false,
        message: "Method Not Allowed",
      });
    }

    const { id, userId, roleId, status } = req.body;

    // Validate required fields
    if (!id || !roleId || !userId || status === undefined) {
      return res.status(400).json({
        status: false,
        message: "Missing required fields",
      });
    }

    // Verify user exists
    const user = await prisma.user.findFirst({
      where: { userId: Number(userId), roleId: Number(roleId), status: 1 },
    });

    if (!user) {
      return res.status(401).json({
        status: false,
        message: "User not found or inactive",
      });
    }

    // Fetch album by ID & status
    const album = await prisma.photoAlbum.findFirst({
      where: { id: Number(id), status: Number(status) },
    });

    if (!album) {
      return res.status(404).json({
        status: false,
        message: "Album not found",
      });
    }

    // Transform album data to include full URLs
    const albumDetail = {
      id: album.id,
      title: album.title,
      day: album.day,
      dateTime: album.dateTime,
      status: album.status,
      createdOn: album.createdOn,
      thumbnail: `${BASE_URL_IMG}${album.thumbnail}`,
      albumImage: Array.isArray(album.albumImage)
        ? album.albumImage.map((img) => `${BASE_URL_IMG}${img}`)
        : [],
    };

    return res.status(200).json({
      status: true,
      message: "Album details fetched successfully",
      data: albumDetail,
    });
  } catch (error) {
    console.error("Fetch Album Detail Error:", error);
    return res.status(500).json({
      status: false,
      message: "Internal Server Error",
    });
  }
};

module.exports = { uploadAlbum, fetchAlbumList, fetchAlbumDetail };
