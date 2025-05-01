import { sdk } from "@farcaster/frame-sdk";
import { useEffect, useState } from "react";
import { useAccount, useConnect, type BaseError, useSendTransaction, useWaitForTransactionReceipt } from "wagmi";
import { parseEther} from 'viem' 

interface Todo {
  id: number;
  text: string;
  completed: boolean;
  ethStake: number;
}

function App() {
  useEffect(() => {
    sdk.actions.ready();
  }, []);

  return (
    <>
      <ConnectMenu />
      <TodoList />
    </>
  );
}
type TransactionProps = {
  value: number
}

type PrimaryAddress = {
  result : {
    address: {
      fid: number, 
      protocol: string, 
      address: string
    }
  }
}

export function SendTransaction(props: TransactionProps) {
  const { 
    data: hash,
    error,
    isPending, 
    sendTransaction 
  } = useSendTransaction()

  async function resolveFidToAddress(fid: string) {
    const response = await fetch(`https://api.warpcast.com/fc/primary-address?fid=${fid}&protocol=ethereum`);
    const primaryAddress: PrimaryAddress = await response.json();
    return primaryAddress.result.address.address
  }

  async function submit(e: React.FormEvent<HTMLFormElement>) { 
    e.preventDefault() 
    const formData = new FormData(e.target as HTMLFormElement) 
    const toFid = formData.get('fid') as string;
    const toAddress =  (await resolveFidToAddress(toFid)) as `0x${string}`;
    sendTransaction({ to: toAddress, value: parseEther(props.value.toString())}) 
  } 

  const { isLoading: isConfirming, isSuccess: isConfirmed } = 
    useWaitForTransactionReceipt({ 
      hash, 
    }) 

  return (
    <form onSubmit={submit}>
      <input name="fid" placeholder="1234" required />
      <button 
        disabled={isPending} 
        type="submit"
      >
        {isPending ? 'Confirming...' : 'Donate for pending tasks'} 
      </button>
      {hash && <div>Transaction Hash: {hash}</div>} 
      {isConfirming && <div>Waiting for confirmation...</div>} 
      {isConfirmed && <div>Transaction confirmed.</div>} 
      {error && (
        <div>Error: {(error as BaseError).shortMessage || error.message}</div>
      )}
    </form>
  )
}

function TodoList() {
  const [todos, setTodos] = useState<Todo[]>([]);
  const [inputValue, setInputValue] = useState("");

  const addTodo = () => {
    if (inputValue.trim()) {
      const newTodo = {
        id: Date.now(),
        text: inputValue.trim(),
        completed: false,
        ethStake: 0.000027
      };
      setTodos([...todos, newTodo]);
      setInputValue("");
    }
  };

  const toggleTodo = (id: number) => {
    setTodos(todos.map((todo) => (todo.id === id ? { ...todo, completed: !todo.completed } : todo)));
  };

  const deleteTodo = (id: number) => {
    setTodos(todos.filter((todo) => todo.id !== id));
  };

  const stakeForPendingTasks = () => {
    let total = 0;
    for (const todo of todos) {
      if (!todo.completed) {
        total += todo.ethStake;
      } 
    }
    return total
  }

  return (
    <div style={{ marginTop: "20px", maxWidth: "500px" }}>
      <h2>Todo List</h2>
      <div style={{ display: "flex", marginBottom: "10px" }}>
        <input
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && addTodo()}
          placeholder="Add a new task..."
          style={{ flex: 1, padding: "8px", marginRight: "8px" }}
        />
        <button type="button" onClick={addTodo}>
          Add
        </button>
      </div>

      <ul style={{ listStyleType: "none", padding: 0 }}>
        {todos.map((todo) => (
          <li
            key={todo.id}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "8px",
              marginBottom: "8px",
              borderBottom: "1px solid #eee",
            }}
          >
            <div style={{ display: "flex", alignItems: "center" }}>
              <input
                type="checkbox"
                checked={todo.completed}
                onChange={() => toggleTodo(todo.id)}
                style={{ marginRight: "10px" }}
              />
              <span
                style={{
                  textDecoration: todo.completed ? "line-through" : "none",
                  color: todo.completed ? "#888" : "white",
                }}
              >
                {todo.text}
              </span>
            </div>
            <button
              type="button"
              onClick={() => deleteTodo(todo.id)}
              style={{ background: "none", border: "none", cursor: "pointer" }}
            >
              ×
            </button>
          </li>
        ))}
      </ul>

      {todos.length > 0 && (
        <div style={{ marginTop: "10px" }}>
          <p>
            {todos.filter((todo) => todo.completed).length} of {todos.length} tasks completed
          </p>
        </div>
      )}
      <p>Stake for pending tasks: {stakeForPendingTasks()}</p>
      <SendTransaction value={stakeForPendingTasks()}/>
    </div>
  );
}

function ConnectMenu() {
  const { isConnected, address } = useAccount();
  const { connect, connectors } = useConnect();

  if (isConnected) {
    return (
      <>
        <div>Connected account:</div>
        <div>{address}</div>
      </>
    );
  }

  return (
    <button type="button" onClick={() => connect({ connector: connectors[0] })}>
      Connect
    </button>
  );
}

export default App;
