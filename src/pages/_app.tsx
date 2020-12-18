import { Grommet, grommet, ThemeType } from "grommet";
import { deepMerge } from "grommet/utils";
import { SWRConfig } from "swr";
import Nav from "../components/nav";
import styles from "../styles/app.module.css";
import "../styles/globals.css";
import { UserProvider } from "../components/user";
import { fetchWithAuth } from "../utils";

const grommetTheme = deepMerge<ThemeType, ThemeType>(grommet, {
  global: {
    font: {
      family: `"Rubik", -apple-system, BlinkMacSystemFont, "Segoe UI", "Roboto", "Oxygen", "Ubuntu", "Cantarell", "Fira Sans",
      "Droid Sans", "Helvetica Neue", sans-serif !important`,
    },
    colors: {
      brand: "#2148d9",
      "accent-1": "#0070de",
      focus: "#c41f3b",
      "horde-background": "#930c08",
      "alliance-background": "#004f9e",
      "neutral-border": {
        dark: "#777",
        light: "#131315",
      },
      "horde-border": "#7e071b",
      "alliance-border": "#0070de",
      "background-back": {
        light: "#ffffff",
        dark: "#131315",
      },
    },
  },
  formField: {
    round: "6px",
    label: {
      margin: {
        horizontal: "xsmall",
      },
    },
    border: {
      side: "all",
    },
  },
  button: {
    border: {
      radius: "6px",
    },
    size: {
      small: {
        border: {
          radius: "6px",
        },
      },
      medium: {
        border: {
          radius: "6px",
        },
      },
    },
  },
});

function MyApp({ Component, pageProps }) {
  return (
    <UserProvider>
      <SWRConfig
        value={{
          fetcher: (key) => {
            return fetchWithAuth(key).json();
          },
        }}>
        <Grommet
          theme={grommetTheme}
          css={`
            flex: 1;
            display: flex;
            flex-direction: column;
          `}>
          <a className={styles["skip-to-content-link"]} href={"#contentstart"}>
            Skip to content
          </a>
          <Nav />
          <Component {...pageProps} />
        </Grommet>
      </SWRConfig>
    </UserProvider>
  );
}

export default MyApp;
