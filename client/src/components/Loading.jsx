function Loading({ message = "Loading..." }) {
  return (
    <div className="flex min-h-40 items-center justify-center">
      <p className="text-gray-500">{message}</p>
    </div>
  );
}

export default Loading;