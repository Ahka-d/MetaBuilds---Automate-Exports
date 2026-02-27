interface TextInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

export default function TextInput({ value, onChange, placeholder }: TextInputProps) {
  return (
    <textarea
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder || 'Describe el producto o añade información adicional...'}
      className="w-full h-32 px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-gray-100 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
    />
  );
}
