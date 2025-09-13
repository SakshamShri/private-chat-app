import React, { useState } from "react";
import {
  Box,
  Text,
  Stack,
  Field,
  Input,
  Button,
} from "@chakra-ui/react";
import { toaster } from "../ui/toaster";

const SignupPage = ({ onSignupSuccess }) => {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [pic, setPic] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  // Debug environment variables on component mount
  React.useEffect(() => {
    console.log("=== Environment Variables Debug ===");
    console.log("REACT_APP_CLOUDINARY_CLOUD_NAME:", process.env.REACT_APP_CLOUDINARY_CLOUD_NAME);
    console.log("REACT_APP_CLOUDINARY_UPLOAD_PRESET:", process.env.REACT_APP_CLOUDINARY_UPLOAD_PRESET);
    console.log("REACT_APP_API_URL:", process.env.REACT_APP_API_URL);
    console.log("=====================================");
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (password !== confirmPassword) {
      toaster.create({ 
        title: "Passwords do not match", 
        type: "warning", 
        closable: true 
      });
      return;
    }
    
    setIsLoading(true);
    
    try {
      const userData = { name, email, password };
      if (pic && pic.trim() !== '') {
        userData.pic = pic;
      }
      
      const response = await fetch(`${process.env.REACT_APP_API_URL}/api/user`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(userData),
      });

      const data = await response.json();

      if (response.ok) {
        // Store user data and token in localStorage
        localStorage.setItem("userInfo", JSON.stringify(data));
        toaster.create({ 
          title: "Account created successfully!", 
          type: "success", 
          closable: true 
        });
        onSignupSuccess(data);
      } else {
        toaster.create({ 
          title: data.message || "Signup failed", 
          type: "error", 
          closable: true 
        });
      }
    } catch (error) {
      console.error("Signup error:", error);
      toaster.create({ 
        title: "Network error. Please try again.", 
        type: "error", 
        closable: true 
      });
    } finally {
      setIsLoading(false);
    }
  };

  const postDetails = (pics) => {
    console.log("postDetails called with:", pics);
    
    // Check if environment variables are loaded
    if (!process.env.REACT_APP_CLOUDINARY_CLOUD_NAME || !process.env.REACT_APP_CLOUDINARY_UPLOAD_PRESET) {
      toaster.create({ 
        title: "Environment variables not loaded. Please refresh the page.", 
        type: "error", 
        closable: true 
      });
      return;
    }
    
    if (pics === undefined) {
      toaster.create({ 
        title: "Please select an image", 
        type: "warning", 
        closable: true 
      });
      return;
    }
    
    // Check file type
    if (pics.type !== "image/jpeg" && pics.type !== "image/png") {
      toaster.create({ 
        title: "Please select a JPEG or PNG image", 
        type: "warning", 
        closable: true 
      });
      return;
    }
    
    // Check file size (max 10MB)
    if (pics.size > 10 * 1024 * 1024) {
      toaster.create({ 
        title: "Image size too large. Please select an image smaller than 10MB", 
        type: "warning", 
        closable: true 
      });
      return;
    }
    
    // Create FormData with correct parameters
    const data = new FormData();
    data.append("file", pics);
    data.append("upload_preset", process.env.REACT_APP_CLOUDINARY_UPLOAD_PRESET);
    
    const uploadUrl = `https://api.cloudinary.com/v1_1/${process.env.REACT_APP_CLOUDINARY_CLOUD_NAME}/image/upload`;
    console.log("Upload URL:", uploadUrl);
    console.log("Upload preset:", process.env.REACT_APP_CLOUDINARY_UPLOAD_PRESET);
    console.log("FormData entries:", Array.from(data.entries()));
    
    fetch(uploadUrl, {
      method: "post",
      body: data,
    })
      .then((res) => {
        console.log("Response status:", res.status);
        console.log("Response headers:", res.headers);
        if (!res.ok) {
          return res.json().then(errorData => {
            console.error("Error response:", errorData);
            throw new Error(`HTTP error! status: ${res.status}, message: ${errorData.error?.message || 'Unknown error'}`);
          });
        }
        return res.json();
      })
      .then((responseData) => {
        console.log("Full Cloudinary response:", responseData);
        
        // Extract the image URL from the response
        let imageUrl = null;
        
        if (responseData.secure_url) {
          imageUrl = responseData.secure_url;
        } else if (responseData.url) {
          imageUrl = responseData.url;
        } else if (responseData.public_id) {
          // Construct URL from public_id if needed
          imageUrl = `https://res.cloudinary.com/${process.env.REACT_APP_CLOUDINARY_CLOUD_NAME}/image/upload/${responseData.public_id}`;
        }
        
        console.log("Extracted image URL:", imageUrl);
        
        if (imageUrl) {
          setPic(imageUrl);
          toaster.create({ 
            title: "Image uploaded successfully!", 
            type: "success", 
            closable: true 
          });
          
          // Test the URL by creating an image element
          const testImg = new Image();
          testImg.onload = () => {
            console.log("✅ Image URL is valid and loads correctly");
          };
          testImg.onerror = () => {
            console.log("❌ Image URL failed to load");
          };
          testImg.src = imageUrl;
          
        } else {
          console.error("No valid image URL found in response:", responseData);
          toaster.create({ 
            title: "Upload failed: No valid image URL returned", 
            type: "error", 
            closable: true 
          });
        }
      })
      .catch((err) => {
        console.error("Upload error:", err);
        toaster.create({ 
          title: `Image upload failed: ${err.message}`, 
          type: "error", 
          closable: true 
        });
      });
  };

  return (
    <div style={{ 
      height: "100vh", 
      overflowY: "auto", 
      padding: "20px", 
      display: "flex", 
      flexDirection: "column", 
      alignItems: "center" 
    }}>
      <div style={{ 
        display: "flex", 
        justifyContent: "center", 
        padding: "12px", 
        width: "60%", 
        minWidth: "400px",
        marginTop: "10px", 
        marginBottom: "16px", 
        borderRadius: "8px", 
        border: "1px solid #e2e8f0", 
        backgroundColor: "rgba(255,255,255,0.5)" 
      }}>
        <Text
          fontSize="4xl"
          fontFamily="Work sans"
          color="black"
          fontWeight="bold"
          textAlign="center"
        >
          Sign Up
        </Text>
      </div>

      <div style={{ 
        width: "60%", 
        minWidth: "400px",
        maxWidth: "600px",
        border: "1px solid #e2e8f0", 
        borderRadius: "8px", 
        padding: "16px", 
        backgroundColor: "black",
        marginBottom: "20px"
      }}>
        <form onSubmit={handleSubmit}>
          <Stack gap="4">
            <Field.Root required>
              <Field.Label>Name</Field.Label>
              <Input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Enter your name"
                required
              />
            </Field.Root>
            <Field.Root required>
              <Field.Label>Email</Field.Label>
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter your email"
                required
              />
            </Field.Root>
            <Field.Root required>
              <Field.Label>Password</Field.Label>
              <Input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Create a password"
                required
              />
            </Field.Root>
            <Field.Root required>
              <Field.Label>Confirm Password</Field.Label>
              <Input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirm your password"
                required
              />
            </Field.Root>
            <Field.Root>
              <Field.Label>Upload Photo</Field.Label>
              <Input
                type="file"
                p={1.5}
                accept="image/*"
                onChange={(e) => postDetails(e.target.files[0])}
              />
              {pic && (
                <Box mt={2}>
                  <Text fontSize="sm" color="gray.300">Preview:</Text>
                  <img 
                    src={pic} 
                    alt="Upload preview" 
                    style={{ 
                      width: '100px', 
                      height: '100px', 
                      objectFit: 'cover',
                      borderRadius: '8px',
                      marginTop: '8px'
                    }} 
                    onError={(e) => {
                      console.error("Image failed to load:", pic);
                      e.target.style.display = 'none';
                    }}
                  />
                </Box>
              )}
            </Field.Root>
            <Button type="submit" colorPalette="green" loading={isLoading}>
              Create Account
            </Button>
          </Stack>
        </form>
      </div>
    </div>
  );
};

export default SignupPage;
