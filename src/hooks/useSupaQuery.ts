import { useState, useCallback } from 'react';

type Data<TData> = TData extends object ? { [K in keyof TData]: null } : null;

type AsyncFunction<TData, TError> = () => Promise<{
  data: TData | Data<TData> | null;
  error: TError | null;
  count: number | null;
}>;

function useSupaQuery<TData, TError>(callback: AsyncFunction<TData, TError>) {
  const [error, setError] = useState<TError | null>(null);
  const [data, setData] = useState<TData | Data<TData> | null>(null);
  const [count, setCount] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isError, setIsError] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const run = useCallback(async () => {
    setIsLoading(true);

    const { error: callBackError, data: callBackData, count: callBackCount } = await callback();

    if (callBackError) {
      setIsError(true);
      setIsSuccess(false);
      setError(callBackError);
    } else {
      setIsError(false);
      setIsSuccess(true);
      setData(callBackData);
      setCount(callBackCount);
    }

    setIsLoading(false);
  }, [callback]);

  return [
    run,
    {
      data,
      count,
      error,
      isLoading,
      isError,
      isSuccess,
    },
  ] as const;
}

export default useSupaQuery;
