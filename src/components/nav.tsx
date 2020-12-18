import Link from "next/link";
import { useRouter } from "next/router";
import { Text } from "grommet";
import styles from "./nav.module.scss";
import { userContext } from "./user";
import { cx } from "./utils";
import { useContext } from "react";

const Nav = () => {
  const { user, setUser } = useContext(userContext);
  const router = useRouter();
  return (
    <nav className={styles.menu}>
      <ul>
        <li>
          <Link href={"/"} passHref>
            <a className={cx(styles.menu_item, router.asPath === "/" && styles.menu_item_active)}>
              <Text weight={500}>Home</Text>
            </a>
          </Link>
        </li>
        {user === null && (
          <>
            <li>
              <Link href={"/login"} passHref>
                <a className={cx(styles.menu_item, router.asPath === "/login" && styles.menu_item_active)}>
                  <Text weight={500}>Login</Text>
                </a>
              </Link>
            </li>
            <li>
              <Link href={"/register"} passHref>
                <a className={cx(styles.menu_item, router.asPath === "/register" && styles.menu_item_active)}>
                  <Text weight={500}>Register</Text>
                </a>
              </Link>
            </li>
          </>
        )}
        {user !== null && (
          <>
            <li>
              <Link href={"/dashboard"} passHref>
                <a className={cx(styles.menu_item, router.asPath === "/dashboard" && styles.menu_item_active)}>
                  <Text weight={500}>{user.username}&apos;s Dashboard</Text>
                </a>
              </Link>
            </li>
            <li>
              <a
                className={cx(styles.menu_item)}
                onClick={() => {
                  setUser(null);
                  globalThis?.localStorage.removeItem("__user");
                  router.push("/");
                }}>
                <Text weight={500}>Sign out</Text>
              </a>
            </li>
          </>
        )}
      </ul>
    </nav>
  );
};

export default Nav;
