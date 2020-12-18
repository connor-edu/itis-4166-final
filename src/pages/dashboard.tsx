import {
  Box,
  Button,
  Collapsible,
  ColumnConfig,
  DataTable,
  DateInput,
  Heading,
  MaskedInput,
  MaskedInputProps,
  ResponsiveContext,
  Select,
  Text,
  TextInput,
} from "grommet";
import ky from "ky";
import { useRouter } from "next/router";
import { useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import useSWR, { mutate as globalMutate } from "swr";
import { Chart } from "chart.js";
import { useUser } from "../components/user";
import { fetchWithAuth, useIsomorphicLayoutEffect } from "../utils";

const currencyFormatter = new Intl.NumberFormat(undefined, {
  style: "currency",
  currency: "USD",
});

const dateFormatter = new Intl.DateTimeFormat(undefined, {
  //@ts-ignore
  dateStyle: "medium",
});

const chartColors = [
  "rgb(54, 162, 235)",
  "rgb(75, 192, 192)",
  "rgb(255, 111, 0)",
  "rgb(255, 159, 64)",
  "rgb(153, 102, 255)",
  "rgb(255, 99, 132)",
  "rgb(255, 205, 86)",
  "rgb(27, 94, 32)",
  "rgb(64, 196, 255)",
];

type BudgetType = {
  name: string;
  amount: number;
  id: number;
};

type ExpenseType = {
  name: string;
  amount: number;
  id: number;
  budget: number;
  date: string;
};

const BudgetAmountMask: MaskedInputProps["mask"] = [
  {
    fixed: "$",
  },
  {
    regexp: /^\d+$/,
    placeholder: "3",
  },
  {
    fixed: ".",
  },
  {
    length: 2,
    regexp: /^\d?\d?$/,
    placeholder: "00",
  },
];

const addBudgetEntryDefaultValue = {
  name: "",
  amount: "",
};

const addExpenseEntryDefaultValue = {
  name: "",
  amount: "",
  date: new Date().toISOString(),
  budget: -1,
};

// A regex to match a dollar input.
// The masked text input will always include the $ sign,
// so this regex matches the $ plus and dollar amount and an
// optional period with double digits for the cents.
const budgetRegex = /^\$(\d+)(?:\.(\d\d))?$/;

export function debounce<F extends (...params: any[]) => void>(fn: F, delay: number) {
  let timeoutID: number = null;
  // eslint-disable-next-line func-names
  return function (this: any, ...args: any[]) {
    clearTimeout(timeoutID);
    timeoutID = window.setTimeout(() => fn.apply(this, args), delay);
  } as F;
}

const BudgetChart: React.FC<{ data: BudgetType[] }> = ({ data }) => {
  const elementref = useRef<HTMLCanvasElement>();
  const chartref = useRef<Chart>();
  useIsomorphicLayoutEffect(() => {
    chartref.current = new Chart(elementref.current.getContext("2d"), {
      type: "pie",
      data: {
        datasets: [{ data: [] }],
        labels: [],
      },
      options: {
        responsive: true,
        animation: {
          duration: 0,
        },
        hover: {
          animationDuration: 0,
        },
        responsiveAnimationDuration: 0,
      },
    });
  }, []);
  const updateChart = useMemo(() => {
    return debounce(() => {
      chartref.current.update();
    }, 100);
  }, []);
  useIsomorphicLayoutEffect(() => {
    chartref.current.data = {
      datasets: [
        {
          data: data.map((a) => a.amount),
          backgroundColor: data.map((_, ind) => {
            return chartColors[ind % 9];
          }),
        },
      ],
      labels: data.map((a) => a.name),
    };
    updateChart();
  }, [data]);
  return (
    <div
      css={`
        min-width: 0;
      `}>
      <div
        css={`
          position: relative;
          overflow: auto;
        `}>
        <canvas
          ref={elementref}
          css={`
            width: 100% !important;
          `}
        />
      </div>
    </div>
  );
};

const Budget = () => {
  // This state flag to used to control if the user input for adding
  // a new budget entry is shown.
  const [addEntryCollapsed, setAddEntryCollapsed] = useState(true);
  // The value of the new budget entry that the user is editing.
  const [addEntryValue, setAddEntryValue] = useState(addBudgetEntryDefaultValue);
  // `budget` is the server-provided data for the budget for this user.
  // The top-level `useSWR` config sets the correct headers to authorize the requests.
  // `mutateBudget` is an optimization we use to modify the local copy of the user's budget
  // after they add/remove a entry, then data is then revalidated by requesting another copy from the server.
  const { data: budget, mutate: mutateBudget } = useSWR<BudgetType[]>("/api/budget");
  // This optional string is used to signify if there was any error while adding an entry.
  const [addEntryError, setAddEntryError] = useState<string | null>(null);
  const [addEntryLoading, setAddEntryLoading] = useState(false);
  const addBudgetEntry = useCallback(async () => {
    // Reset any previous errors from adding an entry.
    setAddEntryError(null);
    setAddEntryLoading(true);
    // Check to see if the user has entered a name for this new entry.
    if (!addEntryValue.name || addEntryValue.name.length === 0) {
      setAddEntryError("Please enter a name.");
      setAddEntryLoading(false);
      return;
    }

    // Check to see if the user has entered a amount for this entry, and
    // also check to see if its a valid dollar amount.
    if (!addEntryValue.amount || !budgetRegex.test(addEntryValue.amount)) {
      setAddEntryError("Please enter a valid amount.");
      setAddEntryLoading(false);
      return;
    }

    // Exec our regex to get the capture groups (dollar amount, and optional cents)
    // I could probably just strip the $ sign off the string and pass the result to
    // `parseInt` but you know we're gonna be fancy here and do the conversions ourselves.
    const [, _dollars, _cents] = budgetRegex.exec(addEntryValue.amount);
    const dollars = Number(_dollars);
    const cents = _cents ? Number(_cents) : 0;
    const amount = dollars + cents / 100;

    // Mutate our local copy of the user's budget and do not revalidate the server copy yet.
    mutateBudget((oldBudget) => {
      return [...oldBudget, { name: addEntryValue.name, amount, id: 0 }];
    }, false);
    try {
      // Ask the server to add our new entry to our budget.
      await fetchWithAuth.post("/api/budget", {
        json: { name: addEntryValue.name, amount },
      });
      // If the request is successfull, we need to do some cleanup
      // we reset the form, remove any displayed errors and hide the form.
      setAddEntryValue(addBudgetEntryDefaultValue);
      setAddEntryCollapsed(true);
      setAddEntryError(null);
    } catch (_e) {
      // If there was an error we attempt to get an message from the server,
      // and if not display a generic message.
      if (_e instanceof ky.HTTPError) {
        try {
          const err = await _e.response.json();
          setAddEntryError(err.error);
        } catch (_e) {
          setAddEntryError("Internal Network Error");
        }
      } else {
        setAddEntryError("Internal Network Error");
      }
    } finally {
      // Regardless if the request was successfull or not we should update our budget,
      // and reset the loading boolean.
      mutateBudget();
      setAddEntryLoading(false);
    }
  }, [addEntryValue]);

  // This array holds the ids of all the selected rows,
  // this is used to remove entries from our budget.
  const [selectedRows, setSelectedRows] = useState([]);
  // Our columns that are used to render our table, this is pretty much contant, so its placed in a `useMemo` hook,
  // however there seems to be a bug or oversight in the UI library as the aggregate footer for
  // the amount total doesn't work if there isn't any data to display.
  // In that case we disable the aggregate footer, and re-enable it whenever there is data to display.
  const BudgetColumns: Array<ColumnConfig<BudgetType>> = useMemo(() => {
    return [
      {
        property: "name",
        header: (
          <Heading level={3} margin={"none"}>
            Name
          </Heading>
        ),
        // eslint-disable-next-line react/display-name
        render: (data) => {
          return (
            <Text weight={500} size={"large"}>
              {data.name}
            </Text>
          );
        },
      },
      {
        property: "amount",
        header: (
          <Heading level={3} margin={"none"}>
            Amount
          </Heading>
        ),
        // eslint-disable-next-line react/display-name
        render: (data) => {
          return <Text size={"large"}>{currencyFormatter.format(data.amount)}</Text>;
        },
        aggregate: budget && budget.length > 1 ? "sum" : undefined,
        footer: {
          aggregate: budget && budget.length > 1,
        },
      },
    ];
  }, [budget]);
  const [removeEntriesLoading, setRemoveEntriesLoading] = useState(false);
  const removeEntries = useCallback(async () => {
    setRemoveEntriesLoading(true);
    await fetchWithAuth.delete("/api/budget", {
      json: {
        entries: selectedRows,
      },
    });
    setSelectedRows([]);
    mutateBudget();
    setRemoveEntriesLoading(false);
    // we also force the expenses table to refresh, since we might remove any related expenses.
    globalMutate("/api/expense");
  }, [selectedRows]);
  const size = useContext(ResponsiveContext);
  const isLarge = size === "large" || size === "xlarge";
  return (
    <Box>
      <Box>
        <Heading level={2}>Budget</Heading>
      </Box>
      <Box direction={isLarge ? "row" : "column-reverse"} gap={"small"}>
        <Box flex={{ grow: isLarge ? 1.5 : 1, shrink: 0 }} basis={"0"}>
          <Box margin={{ bottom: "small" }} justify={"end"} direction={"row"} gap={"small"}>
            <Button
              color={"status-critical"}
              disabled={selectedRows.length === 0 || removeEntriesLoading}
              label={selectedRows.length > 1 ? "Remove Entries" : "Remove Entry"}
              onClick={() => removeEntries()}
            />
            <Button
              color={addEntryCollapsed ? "control" : "status-critical"}
              label={addEntryCollapsed ? "Add Entry" : "Cancel"}
              onClick={() => {
                setAddEntryCollapsed((a) => !a);
                setAddEntryValue(addBudgetEntryDefaultValue);
                setAddEntryError(null);
              }}
            />
          </Box>
          <Collapsible open={!addEntryCollapsed}>
            <Box>
              <Box margin={{ vertical: "medium" }} direction={"row"} gap={"small"}>
                <TextInput
                  value={addEntryValue.name}
                  onChange={(e) =>
                    setAddEntryValue((v) => {
                      return {
                        ...v,
                        name: e.target.value,
                      };
                    })
                  }
                  placeholder={"Name"}
                />
                <MaskedInput
                  value={addEntryValue.amount}
                  onChange={(e) =>
                    setAddEntryValue((v) => {
                      return {
                        ...v,
                        amount: e.target.value,
                      };
                    })
                  }
                  mask={BudgetAmountMask}
                />
                <Button label={"Add"} primary onClick={addBudgetEntry} disabled={addEntryLoading} />
              </Box>
              {addEntryError && (
                <Box margin={{ bottom: "small", horizontal: "xsmall" }}>
                  <Text color={"status-critical"}>{addEntryError}</Text>
                </Box>
              )}
            </Box>
          </Collapsible>
          <DataTable
            sortable
            columns={BudgetColumns}
            data={budget || []}
            select={selectedRows}
            onSelect={setSelectedRows}
            primaryKey={"id"}
            //@ts-expect-error
            placeholder={
              !budget ? (
                <Box
                  fill
                  align={"center"}
                  justify={"center"}
                  direction={"row"}
                  pad={"large"}
                  gap={"small"}
                  background={{ color: "background-front", opacity: "strong" }}>
                  <Box
                    direction={"row"}
                    border={[
                      { side: "all", color: "transparent", size: "medium" },
                      { side: "horizontal", color: "brand", size: "medium" },
                    ]}
                    pad={"small"}
                    round={"full"}
                    animation={"rotateRight"}
                  />
                  <Text weight={"bold"}>Loading ...</Text>
                </Box>
              ) : null
            }
          />
        </Box>
        <Box flex={{ grow: 1, shrink: 0 }} basis={"0"}>
          <BudgetChart data={budget || []} />
        </Box>
      </Box>
    </Box>
  );
};

const ExpensesChart: React.FC<{ budget: BudgetType[]; data: ExpenseType[] }> = ({ data, budget }) => {
  const elementref = useRef<HTMLCanvasElement>();
  const chartref = useRef<Chart>();
  useIsomorphicLayoutEffect(() => {
    chartref.current = new ((Chart as any).PolarArea as typeof Chart)(elementref.current.getContext("2d"), {
      type: "polar",
      data: {
        datasets: [{ data: [] }],
        labels: [],
      },
      options: {
        title: {
          text: "Budget Usage",
          display: true,
        },
        responsive: true,
        animation: {
          duration: 0,
        },
        hover: {
          animationDuration: 0,
        },
        responsiveAnimationDuration: 0,
        legend: {},
        tooltips: {
          enabled: true,
          mode: "single",
          callbacks: {
            label(tooltipItems) {
              return tooltipItems.yLabel + "%";
            },
          },
        },
      },
    });
  }, []);
  const updateChart = useRef(
    debounce(() => {
      chartref.current.update();
    }, 100)
  );
  useIsomorphicLayoutEffect(() => {
    chartref.current.data = {
      datasets: [
        {
          data: budget.map((a) => {
            return (
              Math.round(
                ((data.filter((b) => b.budget === a.id).reduce((a, b) => a + b.amount, 0) / a.amount) * 100 +
                  Number.EPSILON) *
                  100
              ) / 100
            );
          }),
          backgroundColor: budget.map((_, ind) => {
            return chartColors[ind % 9];
          }),
        },
      ],
      labels: budget.map((a) => a.name),
    };
    updateChart.current();
  }, [data]);
  return (
    <div
      css={`
        min-width: 0;
      `}>
      <div
        css={`
          position: relative;
          overflow: auto;
        `}>
        <canvas
          ref={elementref}
          css={`
            width: 100% !important;
          `}
        />
      </div>
    </div>
  );
};

const Expenses = () => {
  // This state flag to used to control if the user input for adding
  // a new expense entry is shown.
  const [addEntryCollapsed, setAddEntryCollapsed] = useState(true);
  // The value of the new budget entry that the user is editing.
  const [addEntryValue, setAddEntryValue] = useState(addExpenseEntryDefaultValue);
  // This is the same hook as above, one thing that might stick out is you would think that
  // this would make two requests each time it need to update, however those requests are deduped,
  // and this value is shared with the `<Budget />` component.
  const { data: budget } = useSWR<BudgetType[]>("/api/budget");
  const { data: expenses, mutate: mutateExpenses } = useSWR<ExpenseType[]>("/api/expense");
  // This optional string is used to signify if there was any error while adding an entry.
  const [addEntryError, setAddEntryError] = useState<string | null>(null);
  const [addEntryLoading, setAddEntryLoading] = useState(false);
  const addBudgetEntry = useCallback(async () => {
    // Reset any previous errors from adding an entry.
    setAddEntryError(null);
    setAddEntryLoading(true);
    // Check to see if the user has entered a name for this new entry.
    if (!addEntryValue.name || addEntryValue.name.length === 0) {
      setAddEntryError("Please enter a name.");
      setAddEntryLoading(false);
      return;
    }

    // Check to see if the user has entered a amount for this entry, and
    // also check to see if its a valid dollar amount.
    if (!addEntryValue.amount || !budgetRegex.test(addEntryValue.amount)) {
      setAddEntryError("Please enter a valid amount.");
      setAddEntryLoading(false);
      return;
    }

    if (!addEntryValue.budget || addEntryValue.budget === -1) {
      setAddEntryError("Please select a budget category.");
      setAddEntryLoading(false);
      return;
    }

    if (!addEntryValue.date) {
      setAddEntryError("Please select a date.");
      setAddEntryLoading(false);
      return;
    }

    // Exec our regex to get the capture groups (dollar amount, and optional cents)
    // I could probably just strip the $ sign off the string and pass the result to
    // `parseInt` but you know we're gonna be fancy here and do the conversions ourselves.
    const [, _dollars, _cents] = budgetRegex.exec(addEntryValue.amount);
    const dollars = Number(_dollars);
    const cents = _cents ? Number(_cents) : 0;
    const amount = dollars + cents / 100;

    // Mutate our local copy of the user's budget and do not revalidate the server copy yet.
    mutateExpenses((expenses) => {
      return [
        ...expenses,
        { name: addEntryValue.name, amount, budget: addEntryValue.budget, date: addEntryValue.date, id: 0 },
      ];
    }, false);
    try {
      // Ask the server to add our new entry to our budget.
      await fetchWithAuth.post("/api/expense", {
        json: { name: addEntryValue.name, amount, budget: addEntryValue.budget, date: addEntryValue.date },
      });
      // If the request is successfull, we need to do some cleanup
      // we reset the form, remove any displayed errors and hide the form.
      setAddEntryValue(addExpenseEntryDefaultValue);
      setAddEntryCollapsed(true);
      setAddEntryError(null);
      mutateExpenses();
    } catch (_e) {
      // If there was an error we attempt to get an message from the server,
      // and if not display a generic message.
      if (_e instanceof ky.HTTPError) {
        try {
          const err = await _e.response.json();
          setAddEntryError(err.error);
        } catch (_e) {
          setAddEntryError("Internal Network Error");
        }
      } else {
        setAddEntryError("Internal Network Error");
      }
    } finally {
      // Regardless if the request was successfull or not we should update our budget,
      // and reset the loading boolean.
      setAddEntryLoading(false);
    }
  }, [addEntryValue]);
  // This array holds the ids of all the selected rows,
  // this is used to remove entries from our budget.
  const [selectedRows, setSelectedRows] = useState([]);
  // Our columns that are used to render our table, this is pretty much contant, so its placed in a `useMemo` hook,
  // however there seems to be a bug or oversight in the UI library as the aggregate footer for
  // the amount total doesn't work if there isn't any data to display.
  // In that case we disable the aggregate footer, and re-enable it whenever there is data to display.
  const BudgetColumns: Array<ColumnConfig<ExpenseType>> = useMemo(() => {
    return [
      {
        property: "name",
        header: (
          <Heading level={3} margin={"none"}>
            Name
          </Heading>
        ),
        // eslint-disable-next-line react/display-name
        render: (data) => {
          return (
            <Text weight={500} size={"large"}>
              {data.name}
            </Text>
          );
        },
      },
      {
        property: "budget",
        header: (
          <Heading level={3} margin={"none"}>
            Budget
          </Heading>
        ),
        // eslint-disable-next-line react/display-name
        render: (data) => {
          return <Text size={"large"}>{(budget || []).find((a) => a.id === data.budget)?.name}</Text>;
        },
      },
      {
        property: "amount",
        header: (
          <Heading level={3} margin={"none"}>
            Amount
          </Heading>
        ),
        // eslint-disable-next-line react/display-name
        render: (data) => {
          return <Text size={"large"}>{currencyFormatter.format(data.amount)}</Text>;
        },
      },
      {
        property: "date",
        header: (
          <Heading level={3} margin={"none"}>
            Date
          </Heading>
        ),
        // eslint-disable-next-line react/display-name
        render: (data) => {
          return <Text size={"large"}>{dateFormatter.format(new Date(data.date))}</Text>;
        },
      },
    ];
  }, [budget]);
  const [removeEntriesLoading, setRemoveEntriesLoading] = useState(false);
  const removeEntries = useCallback(async () => {
    setRemoveEntriesLoading(true);
    await fetchWithAuth.delete("/api/expense", {
      json: {
        entries: selectedRows,
      },
    });
    setSelectedRows([]);
    setRemoveEntriesLoading(false);
    mutateExpenses();
  }, [selectedRows]);
  const size = useContext(ResponsiveContext);
  const isLarge = size === "large" || size === "xlarge";
  return (
    <Box>
      <Box>
        <Heading level={2}>Expenses</Heading>
      </Box>
      <Box direction={isLarge ? "row" : "column-reverse"} gap={"small"}>
        <Box flex={{ grow: isLarge ? 1.5 : 1, shrink: 0 }} basis={"0"}>
          <Box margin={{ bottom: "small" }} justify={"end"} direction={"row"} gap={"small"}>
            <Button
              color={"status-critical"}
              disabled={selectedRows.length === 0 || removeEntriesLoading}
              label={selectedRows.length > 1 ? "Remove Entries" : "Remove Entry"}
              onClick={() => removeEntries()}
            />
            <Button
              color={addEntryCollapsed ? "control" : "status-critical"}
              label={addEntryCollapsed ? "Add Entry" : "Cancel"}
              onClick={() => {
                setAddEntryCollapsed((a) => !a);
                setAddEntryValue(addExpenseEntryDefaultValue);
                setAddEntryError(null);
              }}
            />
          </Box>
          <Collapsible open={!addEntryCollapsed}>
            <Box>
              <Box margin={{ vertical: "medium" }} gap={"xsmall"}>
                <Box direction={"row"} gap={"small"}>
                  <TextInput
                    value={addEntryValue.name}
                    onChange={(e) =>
                      setAddEntryValue((v) => {
                        return {
                          ...v,
                          name: e.target.value,
                        };
                      })
                    }
                    placeholder={"Name"}
                  />
                  <MaskedInput
                    value={addEntryValue.amount}
                    onChange={(e) =>
                      setAddEntryValue((v) => {
                        return {
                          ...v,
                          amount: e.target.value,
                        };
                      })
                    }
                    mask={BudgetAmountMask}
                  />
                </Box>
                <Box direction={"row"} gap={"small"}>
                  <Box flex={"grow"}>
                    <Select
                      placeholder={"Budget"}
                      options={budget || []}
                      valueKey={"id"}
                      labelKey={"name"}
                      onChange={({ value }) => {
                        setAddEntryValue((v) => {
                          return {
                            ...v,
                            budget: value.id,
                          };
                        });
                      }}
                    />
                  </Box>
                  <Box flex={"grow"}>
                    <DateInput
                      format={"mm/dd/yyyy"}
                      value={addEntryValue.date}
                      onChange={(e) =>
                        setAddEntryValue((v) => {
                          return {
                            ...v,
                            date: e.value as string,
                          };
                        })
                      }
                    />
                  </Box>
                  <Button label={"Add"} primary onClick={addBudgetEntry} disabled={addEntryLoading} />
                </Box>
              </Box>
              {addEntryError && (
                <Box margin={{ bottom: "small", horizontal: "xsmall" }}>
                  <Text color={"status-critical"}>{addEntryError}</Text>
                </Box>
              )}
            </Box>
          </Collapsible>
          <DataTable
            sortable
            columns={BudgetColumns}
            data={expenses && budget ? expenses : []}
            select={selectedRows}
            onSelect={setSelectedRows}
            primaryKey={"id"}
            //@ts-expect-error
            placeholder={
              !expenses || !expenses ? (
                <Box
                  fill
                  align={"center"}
                  justify={"center"}
                  direction={"row"}
                  pad={"large"}
                  gap={"small"}
                  background={{ color: "background-front", opacity: "strong" }}>
                  <Box
                    direction={"row"}
                    border={[
                      { side: "all", color: "transparent", size: "medium" },
                      { side: "horizontal", color: "brand", size: "medium" },
                    ]}
                    pad={"small"}
                    round={"full"}
                    animation={"rotateRight"}
                  />
                  <Text weight={"bold"}>Loading ...</Text>
                </Box>
              ) : null
            }
          />
        </Box>
        <Box flex={{ grow: 1, shrink: 0 }} basis={"0"}>
          <ExpensesChart data={expenses && budget ? expenses : []} budget={expenses && budget ? budget : []} />
        </Box>
      </Box>
    </Box>
  );
};

const YearlySummary = () => {
  const elementref = useRef<HTMLCanvasElement>();
  const chartref = useRef<Chart>();
  useIsomorphicLayoutEffect(() => {
    chartref.current = new Chart(elementref.current.getContext("2d"), {
      type: "bar",
      data: {
        datasets: [{ data: [] }],
        labels: [],
      },
      options: {
        responsive: true,
        animation: {
          duration: 0,
        },
        hover: {
          animationDuration: 0,
        },
        responsiveAnimationDuration: 0,
        tooltips: {
          mode: "index",
          intersect: false,
        },
        scales: {
          xAxes: [
            {
              stacked: true,
            },
          ],
          yAxes: [
            {
              stacked: true,
            },
          ],
        },
      },
    });
  }, []);
  const updateChart = useRef(
    debounce(() => {
      chartref.current.update();
    }, 100)
  );
  const { data: budget } = useSWR<BudgetType[]>("/api/budget");
  const { data: expenses } = useSWR<ExpenseType[]>("/api/expense");
  useIsomorphicLayoutEffect(() => {
    if (budget && expenses) {
      const currentYear = new Date().getFullYear();
      const expensesInThisYear = expenses.filter((a) => new Date(a.date).getFullYear() === currentYear);
      const groupedByMonth = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
      for (const expense of expensesInThisYear) {
        const month = new Date(expense.date).getMonth();
        if (!groupedByMonth[month]) {
          groupedByMonth[month] = 0;
        }

        groupedByMonth[month] += expense.amount;
      }

      const totalBudgetPerMonth = budget.reduce((a, b) => a + b.amount, 0);

      chartref.current.data = {
        datasets: [
          {
            label: "Expenses",
            data: groupedByMonth,
            backgroundColor: "rgb(54, 162, 235)",
          },
          {
            label: "Unused Budget",
            data: Array.from({ length: 12 }).map((_, i) => Math.max(totalBudgetPerMonth - groupedByMonth[i], 0)),
            backgroundColor: "rgb(255, 99, 132)",
          },
        ],
        labels: [
          "January",
          "February",
          "March",
          "April",
          "May",
          "June",
          "July",
          "August",
          "September",
          "October",
          "November",
          "December",
        ],
      };
      updateChart.current();
    }
  }, [expenses, budget]);
  return (
    <Box>
      <Box>
        <Heading level={2}>Yearly Summary</Heading>
      </Box>
      <div
        css={`
          min-width: 0;
        `}>
        <div
          css={`
            position: relative;
            overflow: auto;
          `}>
          <canvas
            ref={elementref}
            css={`
              width: 100% !important;
            `}
          />
        </div>
      </div>
    </Box>
  );
};

const Dashboard = () => {
  const router = useRouter();
  const user = useUser();
  useEffect(() => {
    if (!user) {
      router.push("/login");
    }
  }, [user]);
  if (!user) {
    return null;
  }

  return (
    <Box flex={"grow"} align={"center"} direction={"column"}>
      <Box margin={{ vertical: "large", horizontal: "small" }} width={{ width: "100%", max: "1200px" }} gap={"small"}>
        <Budget />
        <Expenses />
        <YearlySummary />
      </Box>
    </Box>
  );
};

export default Dashboard;
