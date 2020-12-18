import { Box, Button, Card, CardBody, CardFooter, CardHeader, Form, FormField, Heading, TextInput } from "grommet";
import ky from "ky";
import Head from "next/head";
import Link from "next/link";
import { useRouter } from "next/router";
import { useCallback, useContext, useState } from "react";
import Spinner from "../components/spinner";
import { userContext } from "../components/user";

type RegisterError = { message: string; field?: "username" | "password" | "confirm_password" };

const Register = () => {
  const router = useRouter();
  const [value, setValue] = useState({});
  const [error, setError] = useState<RegisterError | null>(null);
  const [loading, setLoading] = useState(false);
  const uc = useContext(userContext);
  const register = useCallback((values) => {
    setLoading(true);
    setError(null);
    ky.post("/api/register", {
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
            .catch((e) => {
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
        <title>Register | Personal Budget</title>
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
            onChange={(nextValue) => setValue(nextValue)}
            onReset={() => setValue({})}
            onSubmit={({ value }) => {
              register(value);
            }}>
            <Card width={"large"}>
              <CardHeader pad={"medium"} background={"light-2"}>
                <Heading level={3} margin={"none"}>
                  Register
                </Heading>
              </CardHeader>
              <CardBody pad={"medium"}>
                <FormField name={"username"} label={"Username"} required>
                  <TextInput name={"username"} id={"register-form-username"} type={"text"} />
                </FormField>
                <FormField name={"password"} label={"Password"} required>
                  <TextInput name={"password"} id={"register-form-password"} type={"password"} />
                </FormField>
                <FormField name={"confirm_password"} label={"Confirm Password"} required>
                  <TextInput name={"confirm_password"} id={"register-form-confirm-password"} type={"password"} />
                </FormField>
              </CardBody>
              <CardFooter pad={"medium"} background={"light-2"} justify={"between"}>
                <Link href={"/login"} passHref>
                  <Button label={"Login"} />
                </Link>
                {loading ? (
                  <Button
                    disabled
                    primary
                    icon={<Spinner pad={{ horizontal: "xxsmall" }} size={16} />}
                    label={"Register"}
                  />
                ) : (
                  <Button type={"submit"} primary label={"Register"} />
                )}
              </CardFooter>
            </Card>
          </Form>
        </Box>
      </Box>
    </>
  );
};

export default Register;
