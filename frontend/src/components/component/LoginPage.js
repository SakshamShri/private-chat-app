import React, { useState } from "react";
import {
  Container,
  Box,
  Text,
  Stack,
  Field,
  Input,
  Button,
} from "@chakra-ui/react";
import { toaster } from "../ui/toaster";

const LoginPage = ({ onLoginSuccess }) => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    
    try {
      const response = await fetch(`${process.env.REACT_APP_API_URL}/api/user/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (response.ok) {
        // Store user data and token in localStorage
        localStorage.setItem("userInfo", JSON.stringify(data));
        toaster.create({ 
          title: "Login successful!", 
          type: "success", 
          closable: true 
        });
        onLoginSuccess(data);
      } else {
        toaster.create({ 
          title: data.message || "Login failed", 
          type: "error", 
          closable: true 
        });
      }
    } catch (error) {
      console.error("Login error:", error);
      toaster.create({ 
        title: "Network error. Please try again.", 
        type: "error", 
        closable: true 
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Container maxW="container.md" centerContent>
      <Box
        display="flex"
        justifyContent="center"
        p={3}
        w="60%"
        mt={10}
        mb={4}
        borderRadius="lg"
        borderWidth="1px"
        backgroundColor="whiteAlpha.500"
      >
        <Text
          fontSize="4xl"
          fontFamily="Work sans"
          color="black"
          fontWeight="bold"
          textAlign="center"
        >
          Login
        </Text>
      </Box>

      <Box w="60%" borderWidth="1px" borderRadius="lg" p={4} backgroundColor="black">
        <form onSubmit={handleSubmit}>
          <Stack gap="4">
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
                placeholder="Enter your password"
                required
              />
            </Field.Root>
            <Button type="submit" colorPalette="blue" loading={isLoading}>
              Login
            </Button>
          </Stack>
        </form>
      </Box>
    </Container>
  );
};

export default LoginPage;
