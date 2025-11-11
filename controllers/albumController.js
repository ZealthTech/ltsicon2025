require("dotenv").config();
const prisma = require('../prisma'); 
const BASE_URL_IMG = process.env.BASE_URL_IMG;

const uploadAlbum = async (req, res) => {
  try {
    if (req.method !== "POST") {
      return res.status(405).json({
        status: false,
        message: "Method Not Allowed",
      });
    }

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
    let thumbnailPath = null;

    if (req.files.thumbnail && req.files.thumbnail.length > 0) {
      const file = req.files.thumbnail[0];
      const relativePath = file.path.split("uploads")[1].replace(/\\/g, "/");
      thumbnailPath = `/uploads${relativePath}`;
    }

    // Prepare image paths
    const newAlbumImages = req.files.albumImage.map((file) => {
      const relativePath = file.path.split("uploads")[1].replace(/\\/g, "/");
      return `/uploads${relativePath}`;
    });
    console.log("newAlbum", newAlbumImages);
    let album;

    if (id) {
      album = await prisma.photoAlbum.findUnique({
        where: { id: Number(id) },
        include: { albumImage: true },
      });

      if (!album) {
        return res
          .status(404)
          .json({ status: false, message: "Album not found" });
      }

      await prisma.$transaction(async (prisma) => {
        // Update thumbnail if present
        if (req.files.thumbnail && req.files.thumbnail.length > 0) {
          const file = req.files.thumbnail[0];
          const relativePath = file.path
            .split("uploads")[1]
            .replace(/\\/g, "/");
          const newThumbnail = `/uploads${relativePath}`;

          await prisma.photoAlbum.update({
            where: { id: Number(id) },
            data: { thumbnail: newThumbnail },
          });

          album.thumbnail = newThumbnail;
        }

        // Add new images
        const imageRecords = newAlbumImages.map((path) => ({
          path,
          albumId: album.id,
        }));

        if (imageRecords.length > 0) {
          await prisma.albumImage.createMany({ data: imageRecords });
        }
      });

      // Refetch updated album
      album = await prisma.photoAlbum.findUnique({
        where: { id: Number(id) },
        include: { albumImage: true },
      });
    } else {
      // Create new album with nested AlbumImage entries
      album = await prisma.photoAlbum.create({
        data: {
          userId: Number(userId),
          title,
          thumbnail: thumbnailPath, // first image as thumbnail
          day,
          dateTime,
          ownerName,
          status: Number(status),
          createdOn: new Date(),
          albumImage: {
            create: newAlbumImages.map((path) => ({ path })),
          },
        },
        include: { albumImage: true },
      });
    }
    console.log("thumbnailPath", thumbnailPath);
    // Prepare response with full URLs
    const responseData = {
      ...album,
      albumImage: album.albumImage.map((img) => `${BASE_URL_IMG}${img.path}`),
      thumbnail: `${BASE_URL_IMG}${album.thumbnail}`,
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
    if (Number(userId) !== req.user.userId) {
      return res.status(403).json({
        status: false,
        message: "Invalid Token",
      });
    }
    // Check if user exists
    const user = await prisma.user.findFirst({
      where: { userId: Number(userId), role: Number(roleId) },
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
    console.log("req", req.body);
    if (Number(userId) !== req.user.userId) {
      return res.status(403).json({
        status: false,
        message: "Invalid Token",
      });
    }
    // Verify user exists
    const user = await prisma.user.findFirst({
      where: { userId: Number(userId), role: Number(roleId), status: 1 },
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
      include: { albumImage: true },
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
        ? album.albumImage.map((img) => ({
            ...img,
            path: `${BASE_URL_IMG}${img.path}`,
          }))
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

const deleteAlbum = async (req, res) => {
  try {
    if (req.method !== "DELETE") {
      return res.status(405).json({
        status: false,
        message: "Method Not Allowed",
      });
    }

    const { id, ids, userId, roleId } = req.body;

    if (!userId || !roleId) {
      return res
        .status(400)
        .json({ status: false, message: "Missing required fields" });
    }
    // Verify user exists
    const user = await prisma.user.findFirst({
      where: { userId: Number(userId), role: Number(roleId) },
    });
    if (!user) {
      return res.status(401).json({
        status: false,
        message: "Admin not found",
      });
    }
    if (!id && (!ids || !Array.isArray(ids) || ids.length === 0)) {
      return res.status(400).json({
        status: false,
        message: "Provide album id or ids to delete",
      });
    }

    let deletedAlbums;

    if (id) {
      // Delete single album
      const album = await prisma.albumImage.findUnique({
        where: { id: Number(id) },
      });
      if (!album) {
        return res
          .status(404)
          .json({ status: false, message: "Album not found" });
      }

      deletedAlbums = await prisma.albumImage.delete({
        where: { id: Number(id) },
      });
    } else if (ids && ids.length > 0) {
      console.log("isdss", ids);
      // Delete multiple albums
      const numericIds = ids.map(Number);

      // Optional: check existence first
      const existingAlbums = await prisma.albumImage.findMany({
        where: { id: { in: numericIds } },
      });

      if (existingAlbums.length === 0) {
        return res
          .status(404)
          .json({ status: false, message: "No albums found to delete" });
      }

      deletedAlbums = await prisma.albumImage.deleteMany({
        where: { id: { in: numericIds } },
      });
    }

    res.status(200).json({
      status: true,
      message: "Album(s) deleted successfully!",
      data: deletedAlbums,
    });
  } catch (error) {
    console.error("Delete Album Error:", error);
    res.status(500).json({
      status: false,
      message: error.message || "Internal Server Error",
    });
  }
};

module.exports = { uploadAlbum, fetchAlbumList, fetchAlbumDetail, deleteAlbum };
