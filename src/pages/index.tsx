import Head from "next/head";
import Image from "next/image";
import styles from "../styles/home.module.css";

export default function Home() {
  return (
    <>
      <Head>
        <title>Personal Budget</title>
      </Head>

      <div className={styles.hero} id={"contentstart"}>
        <Image src={"/assets/bg.png"} layout={"fill"} />
        <div className={styles.hero_content}>
          <h1>Personal Budget</h1>
          <h2>A personal-budget management app</h2>
        </div>
      </div>

      <main className={`${styles.container} ${styles.center}`}>
        <div className={styles.page_area}>
          <div className={styles.text_box}>
            <h1>Stay on track</h1>
            <p>
              Do you know where you are spending your money? If you really stop to track it down, you would get
              surprised! Proper budget management depends on real data... and this app will help you with that!
            </p>
          </div>
          <div className={styles.text_box}>
            <h1>Alerts</h1>
            <p>What if your clothing budget ended? You will get an alert. The goal is to never go over the budget.</p>
          </div>
          <div className={styles.text_box}>
            <h1>Results</h1>
            <p>
              People who stick to a financial plan, budgeting every expense, get out of debt faster! Also, they to live
              happier lives... since they expend without guilt or fear... because they know it is all good and accounted
              for.
            </p>
          </div>
          <div className={styles.text_box}>
            <h1>Free</h1>
            <p>This app is free!!! And you are the only one holding your data!</p>
          </div>
        </div>
      </main>
    </>
  );
}
