import { Box, Button, Card, CardBody, CardFooter, CardHeader, Form, FormField, Heading, TextInput } from "grommet";
import ky from "ky";
import Head from "next/head";
import Link from "next/link";
import { useRouter } from "next/router";
import { useCallback, useContext, useState } from "react";
import Spinner from "../components/spinner";
import { userContext } from "../components/user";

type LoginError = { message: string; field?: "username" | "password" };

const Login = () => {
  const router = useRouter();
  const [value, setValue] = useState({
    username: "",
    password: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<LoginError | null>(null);
  const uc = useContext(userContext);
  const login = useCallback((values) => {
    setLoading(true);
    setError(null);
    ky.post("/api/login", {
      json: values,
    })
      .then((res) => {
        res.json().then((data) => {
          window.localStorage.setItem("__user", data.token);
          const [, info] = data.token.split(".");
          const user = JSON.parse(atob(info));
          uc.setUser(user);
          router.push("/dashboard");
        });
      })
      .catch((err) => {
        setLoading(false);
        if (err instanceof ky.HTTPError) {
          err.response
            .json()
            .then((e) => {
              setError(e);
            })
            .catch((_e) => {
              setError({
                message: "Network Request Failed.",
              });
            });
        } else {
          setError({
            message: "Network Request Failed.",
          });
        }
      });
  }, []);
  return (
    <>
      <Head>
        <title>Login | Personal Budget</title>
      </Head>
      <Box flex={"grow"} as={"main"}>
        <Box flex={"grow"} align={"center"} margin={{ top: "xlarge" }}>
          <Form
            errors={
              error
                ? {
                    [error.field || "username"]: error.message,
                  }
                : {}
            }
            value={value}
            onChange={(nextValue) => setValue(nextValue as any)}
            onSubmit={({ value }) => {
              login(value);
            }}>
            <Card width={"large"}>
              <CardHeader pad={"medium"} background={"light-2"}>
                <Heading level={3} margin={"none"}>
                  Login
                </Heading>
              </CardHeader>
              <CardBody pad={"medium"}>
                <FormField name={"username"} label={"Username"} required>
                  <TextInput name={"username"} id={"login-form-username"} type={"text"} />
                </FormField>
                <FormField name={"password"} label={"Password"} required>
                  <TextInput name={"password"} id={"login-form-password"} type={"password"} />
                </FormField>
              </CardBody>
              <CardFooter pad={"medium"} background={"light-2"} justify={"between"}>
                <Link href={"/register"} passHref>
                  <Button label={"Register"} />
                </Link>
                {loading ? (
                  <Button
                    disabled
                    primary
                    icon={<Spinner pad={{ horizontal: "xxsmall" }} size={16} />}
                    label={"Login"}
                  />
                ) : (
                  <Button type={"submit"} primary label={"Login"} />
                )}
              </CardFooter>
            </Card>
          </Form>
        </Box>
      </Box>
    </>
  );
};

export default Login;
