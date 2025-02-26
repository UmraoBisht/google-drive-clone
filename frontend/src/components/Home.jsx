import React, { useState, useEffect } from "react";
import axios from "axios";
import { useAuth } from "./AuthContext";
import {
  FolderIcon,
  PhotoIcon,
  ChevronLeftIcon,
  TrashIcon,
} from "@heroicons/react/24/outline";

function Loader() {
  return (
    <div className="flex justify-center items-center">
      <div className="w-6 h-6 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
    </div>
  );
}

function Home() {
  const { token, logout } = useAuth();
  const [folders, setFolders] = useState([]);
  const [images, setImages] = useState([]);
  const [currentFolder, setCurrentFolder] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [uploadName, setUploadName] = useState("");
  const [uploadFile, setUploadFile] = useState(null);
  const [uploadFolder, setUploadFolder] = useState("");
  const [folderName, setFolderName] = useState("");
  const [folderPath, setFolderPath] = useState([]);
  // Loading states
  const [isLoadingFolders, setIsLoadingFolders] = useState(false);
  const [isLoadingImages, setIsLoadingImages] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isCreatingFolder, setIsCreatingFolder] = useState(false);
  const [isDeletingFolder, setIsDeletingFolder] = useState(null); // Folder ID being deleted
  const [isDeletingImage, setIsDeletingImage] = useState(null); // Image ID being deleted

  useEffect(() => {
    console.log("Setting Authorization header with token:", token);
    axios.defaults.headers.common["Authorization"] = token
      ? `Bearer ${token}`
      : "";
    fetchFolders();
    fetchImages(currentFolder);
    updateFolderPath();
  }, [token, currentFolder]);

  const fetchFolders = async () => {
    setIsLoadingFolders(true);
    try {
      const response = await axios.get("/folders");
      setFolders(response.data);
    } catch (error) {
      console.error(
        "Error fetching folders:",
        error.response?.data || error.message
      );
    } finally {
      setIsLoadingFolders(false);
    }
  };

  const fetchImages = async (folderId) => {
    setIsLoadingImages(true);
    try {
      console.log(`Fetching images for folderId: ${folderId || "root"}`);
      const response = await axios.get(`/images?parent_id=${folderId || ""}`);
      console.log("Images fetched:", response.data);
      setImages(response.data);
    } catch (error) {
      console.error(
        "Error fetching images:",
        error.response?.data || error.message
      );
      setImages([]);
    } finally {
      setIsLoadingImages(false);
    }
  };

  const handleSearch = async () => {
    setIsSearching(true);
    try {
      const response = await axios.get(`/search?q=${searchQuery}`);
      setSearchResults(response.data);
    } catch (error) {
      console.error(
        "Error searching images:",
        error.response?.data || error.message
      );
    } finally {
      setIsSearching(false);
    }
  };

  const handleUpload = async (e) => {
    e.preventDefault();
    if (!uploadFile || !uploadName) {
      alert("Please provide a name and select an image file.");
      return;
    }
    setIsUploading(true);
    const formData = new FormData();
    formData.append("name", uploadName);
    formData.append("image", uploadFile);
    if (uploadFolder) formData.append("folder_id", uploadFolder);

    try {
      await axios.post("/images", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setUploadName("");
      setUploadFile(null);
      setUploadFolder("");
      fetchImages(currentFolder);
    } catch (error) {
      console.error("Upload failed:", error);
      alert("Failed to upload image.");
    } finally {
      setIsUploading(false);
    }
  };

  const handleFolderCreate = async (e) => {
    e.preventDefault();
    if (!folderName) {
      alert("Please enter a folder name.");
      return;
    }
    setIsCreatingFolder(true);
    try {
      await axios.post("/folders", {
        name: folderName,
        parent_folder_id: currentFolder || null,
      });
      setFolderName("");
      fetchFolders();
    } catch (error) {
      console.error("Folder creation failed:", error);
      alert("Failed to create folder.");
    } finally {
      setIsCreatingFolder(false);
    }
  };

  const handleDrop = async (e) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) {
      setIsUploading(true);
      const formData = new FormData();
      formData.append("name", file.name);
      formData.append("image", file);
      if (currentFolder) formData.append("folder_id", currentFolder);

      try {
        await axios.post("/images", formData, {
          headers: { "Content-Type": "multipart/form-data" },
        });
        fetchImages(currentFolder);
      } catch (error) {
        console.error("Drag-and-drop upload failed:", error);
        alert("Failed to upload image.");
      } finally {
        setIsUploading(false);
      }
    }
  };

  const handleDeleteFolder = async (folderId) => {
    if (
      !confirm("Are you sure you want to delete this folder? It must be empty.")
    )
      return;
    setIsDeletingFolder(folderId);
    try {
      await axios.delete(`/folders/${folderId}`);
      fetchFolders();
    } catch (error) {
      console.error("Folder delete failed:", error);
      alert(error.response?.data || "Failed to delete folder.");
    } finally {
      setIsDeletingFolder(null);
    }
  };

  const handleDeleteImage = async (imageId) => {
    if (!confirm("Are you sure you want to delete this image?")) return;
    setIsDeletingImage(imageId);
    try {
      await axios.delete(`/images/${imageId}`);
      fetchImages(currentFolder);
      if (searchResults.length > 0) handleSearch();
    } catch (error) {
      console.error("Image delete failed:", error);
      alert("Failed to delete image.");
    } finally {
      setIsDeletingImage(null);
    }
  };

  const updateFolderPath = () => {
    if (!currentFolder) {
      setFolderPath([{ id: null, name: "My Drive" }]);
      return;
    }
    const path = [];
    let current = folders.find((f) => f._id === currentFolder);
    while (current) {
      path.unshift({ id: current._id, name: current.name });
      current = folders.find((f) => f._id === current.parent_folder_id);
    }
    path.unshift({ id: null, name: "My Drive" });
    setFolderPath(path);
  };

  const navigateToFolder = (folderId) => {
    setCurrentFolder(folderId);
    setSearchResults([]);
  };

  return (
    <div
      className="min-h-screen bg-gray-50 p-6"
      onDrop={handleDrop}
      onDragOver={(e) => e.preventDefault()}
    >
      {/* Header */}
      <header className="flex flex-col sm:flex-row justify-between items-center mb-6 bg-white p-4 rounded shadow">
        <div className="flex items-center space-x-4 mb-4 sm:mb-0 w-full sm:w-auto">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search in Drive"
            className="p-2 border rounded w-full sm:w-64 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            onClick={handleSearch}
            className="bg-blue-500 text-white p-2 rounded hover:bg-blue-600 flex items-center"
            disabled={isSearching}
          >
            {isSearching ? <Loader /> : "Search"}
          </button>
        </div>
        <button
          onClick={logout}
          className="bg-red-500 text-white p-2 rounded hover:bg-red-600"
        >
          Logout
        </button>
      </header>

      {/* Breadcrumb Navigation */}
      <div className="mb-4 flex items-center space-x-2 text-sm text-gray-600">
        {folderPath.map((folder, index) => (
          <React.Fragment key={folder.id || "root"}>
            {index > 0 && <ChevronLeftIcon className="w-4 h-4" />}
            <button
              onClick={() => navigateToFolder(folder.id)}
              className="hover:underline"
            >
              {folder.name}
            </button>
          </React.Fragment>
        ))}
      </div>

      <main className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {/* Folder and Image List */}
        <div className="md:col-span-3">
          {isLoadingFolders || isLoadingImages ? (
            <div className="text-center py-10">
              <Loader />
              <p className="mt-2 text-gray-600">Loading...</p>
            </div>
          ) : searchResults.length > 0 ? (
            <div>
              <h2 className="text-lg font-semibold mb-2">Search Results</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {searchResults.map((image) => (
                  <div
                    key={image._id}
                    className="p-4 bg-white rounded shadow flex items-center justify-between"
                  >
                    <div className="flex items-center space-x-4">
                      <PhotoIcon className="w-8 h-8 text-gray-500" />
                      <div>
                        <p className="font-medium">{image.name}</p>
                        <img
                          src={image.url}
                          alt={image.name}
                          className="mt-2 w-24 h-24 object-cover rounded"
                        />
                      </div>
                    </div>
                    <button
                      onClick={() => handleDeleteImage(image._id)}
                      className="text-red-500 hover:text-red-700"
                      disabled={isDeletingImage === image._id}
                    >
                      {isDeletingImage === image._id ? (
                        <Loader />
                      ) : (
                        <TrashIcon className="w-5 h-5" />
                      )}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div>
              <h2 className="text-lg font-semibold mb-2">Folders</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {folders
                  .filter((f) => f.parent_folder_id === currentFolder)
                  .map((folder) => (
                    <div
                      key={folder._id}
                      className="p-4 bg-white rounded shadow flex items-center justify-between"
                    >
                      <div
                        onClick={() => navigateToFolder(folder._id)}
                        className="flex items-center space-x-4 cursor-pointer hover:bg-gray-50 flex-1"
                      >
                        <FolderIcon className="w-8 h-8 text-yellow-500" />
                        <p className="font-medium">{folder.name}</p>
                      </div>
                      <button
                        onClick={() => handleDeleteFolder(folder._id)}
                        className="text-red-500 hover:text-red-700"
                        disabled={isDeletingFolder === folder._id}
                      >
                        {isDeletingFolder === folder._id ? (
                          <Loader />
                        ) : (
                          <TrashIcon className="w-5 h-5" />
                        )}
                      </button>
                    </div>
                  ))}
              </div>
              <h2 className="text-lg font-semibold mt-6 mb-2">Images</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {images.map((image) => (
                  <div
                    key={image._id}
                    className="p-4 bg-white rounded shadow flex items-center justify-between"
                  >
                    <div className="flex items-center space-x-4">
                      <PhotoIcon className="w-8 h-8 text-gray-500" />
                      <div>
                        <p className="font-medium">{image.name}</p>
                        <img
                          src={image.url}
                          alt={image.name}
                          className="mt-2 w-24 h-24 object-cover rounded"
                        />
                      </div>
                    </div>
                    <button
                      onClick={() => handleDeleteImage(image._id)}
                      className="text-red-500 hover:text-red-700"
                      disabled={isDeletingImage === image._id}
                    >
                      {isDeletingImage === image._id ? (
                        <Loader />
                      ) : (
                        <TrashIcon className="w-5 h-5" />
                      )}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Sidebar: Folder Creation and Image Upload */}
        <div className="space-y-6">
          <div className="bg-white p-6 rounded shadow-md">
            <h2 className="text-lg font-semibold mb-4">New Folder</h2>
            <form onSubmit={handleFolderCreate} className="space-y-4">
              <input
                type="text"
                value={folderName}
                onChange={(e) => setFolderName(e.target.value)}
                placeholder="Folder name"
                className="w-full p-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
                disabled={isCreatingFolder}
              />
              <button
                type="submit"
                className="w-full bg-purple-500 text-white p-2 rounded hover:bg-purple-600 flex items-center justify-center"
                disabled={isCreatingFolder}
              >
                {isCreatingFolder ? <Loader /> : "Create"}
              </button>
            </form>
          </div>

          <div className="bg-white p-6 rounded shadow-md">
            <h2 className="text-lg font-semibold mb-4">Upload Image</h2>
            <form onSubmit={handleUpload} className="space-y-4">
              <input
                type="text"
                value={uploadName}
                onChange={(e) => setUploadName(e.target.value)}
                placeholder="Image name"
                className="w-full p-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
                disabled={isUploading}
              />
              <select
                value={uploadFolder}
                onChange={(e) => setUploadFolder(e.target.value)}
                className="w-full p-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                disabled={isUploading}
              >
                <option value="">My Drive</option>
                {folders.map((folder) => (
                  <option key={folder._id} value={folder._id}>
                    {folder.name}
                  </option>
                ))}
              </select>
              <input
                type="file"
                accept="image/*"
                onChange={(e) => setUploadFile(e.target.files[0])}
                className="w-full p-2 border rounded"
                required
                disabled={isUploading}
              />
              <button
                type="submit"
                className="w-full bg-green-500 text-white p-2 rounded hover:bg-green-600 flex items-center justify-center"
                disabled={isUploading}
              >
                {isUploading ? <Loader /> : "Upload"}
              </button>
            </form>
          </div>
        </div>
      </main>
    </div>
  );
}

export default Home;
