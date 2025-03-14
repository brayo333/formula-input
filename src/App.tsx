import { useCallback, useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { type AutoCompObj, useStore } from "./store";
import { Input } from "./components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "./components/ui/popover";
import { Hash } from "lucide-react";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "./components/ui/command";
import { Button } from "./components/ui/button";
import { evaluate } from "mathjs";

// const TAG_PATTERN = /([a-zA-Z]+(?:\s[0-9]+)*)$/;
const TAG_PATTERN_2 = /(?:^|[^0-9a-zA-Z])([a-zA-Z]+(?:\s[a-zA-Z0-9]+)*)?$/;
// const TAG_PATTERN_2 = /([a-zA-Z]+(?:\s[a-zA-Z0-9]+)*)?$/;
const STARTS_WITH_LETTER = /^[A-Za-z].*/;
const NUMERIC_SYMBOLS = /([+\-\/\*\^])/;

const debounce = (func: Function, delay: number) => {
  let timer: NodeJS.Timeout;
  return (...args: any[]) => {
    clearTimeout(timer);
    timer = setTimeout(() => func(...args), delay);
  };
};

const calculateFormula = (tokens: string[], tags: AutoCompObj[]) => {
  try {
    // console.log(tokens)
    const actualValues = tokens.map((token) =>
      STARTS_WITH_LETTER.test(token)
        ? tags.find((tag) => tag.name.trim().replace(/\s+/g, "") == token)
            ?.value ?? "0"
        : token
    );
    // console.log(actualValues)
    const expression = actualValues.join("").replace(/^=\s*/, "");
    // console.log(expression)

    const result = evaluate(expression);
    // console.log(result)
    return result;
  } catch (error) {
    return alert("There was an error calculating values");
  }
};

function App() {
  const { tags, setTags } = useStore((state) => state);

  const { data, error } = useQuery({
    queryKey: ["tags"],
    queryFn: async (): Promise<Array<AutoCompObj>> => {
      const response = await fetch(
        "https://652f91320b8d8ddac0b2b62b.mockapi.io/autocomplete"
      );
      return await response.json();
    },
  });

  // string input from user
  const [formula, setFormula] = useState("");
  // string input from user broken down
  const [tokens, setTokens] = useState<string[]>([]);

  const [output, setOutput] = useState(0);
  const [showAns, setShowAns] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [showSubSuggestions, setShowSubSuggestions] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const [selectedValue, setSelectedValue] = useState("");

  const [suggestions, setSuggestions] = useState<AutoCompObj[]>([]);

  const inputRef = useRef<HTMLInputElement>(null);
  const divRef = useRef<HTMLDivElement>(null);

  const updateSuggestions = useCallback(
    debounce((value: string) => {
      const match = value.match(TAG_PATTERN_2);
      if (match && tags.length > 0) {
        const query = match[1].toLowerCase();
        setSuggestions(
          tags
            .filter((tag) => tag.name.toLowerCase().includes(query))
            .map((tag) => tag)
        );
      } else {
        setSuggestions([]);
      }
    }, 300),
    [tags]
  );

  const clearInput = () => {
    setFormula("");
    setTokens([]);

    setShowAns(false);
    setSelectedValue("");
  };
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;

    if (value.trim().replace(/\s+/g, "") !== "") {
      setFormula(value);
      setTokens(
        value.trim().replace(/\s+/g, "").split(NUMERIC_SYMBOLS).filter(Boolean)
      );
      updateSuggestions(value);
    } else {
      clearInput();
    }

    setShowAns(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && tokens.length > 0) {
      e.preventDefault();
      setOutput(calculateFormula(tokens, tags));
      setShowAns(true);
      setIsFocused(false);
    }
  };

  const handleSelect = (selectedTag: AutoCompObj | undefined) => {
    if (selectedTag) {
      setFormula((prev) =>
        prev.replace(TAG_PATTERN_2, selectedTag.name.toString())
      );

      setTokens((prev) => {
        const newArray = [...prev];
        newArray.pop();
        newArray.push(selectedTag.name.trim().replace(/\s+/g, ""));
        return newArray;
      });
      setSuggestions([]);

      if (inputRef.current) {
        inputRef.current.focus();
        inputRef.current.setSelectionRange(formula.length, formula.length);
      }
    }
  };

  const handleClick = () => {
    setIsFocused(true);
    if (inputRef.current) {
      inputRef.current.focus();
    }
  };

  const handleBlur = () => {
    setIsFocused(false);
  };

  useEffect(() => {
    if (data) {
      setTags(data);
    }
  }, [data]);

  useEffect(() => {
    if (suggestions.length > 0) {
      setShowSuggestions(true);
    } else {
      setShowSuggestions(false);
    }
  }, [suggestions]);

  useEffect(() => {
    setIsFocused(true);
  }, []);

  useEffect(() => {
    if (inputRef.current && isFocused) {
      inputRef.current.focus();
      inputRef.current.setSelectionRange(formula.length, formula.length);
    }
  }, [isFocused]);

  return (
    <div className="w-screen h-screen flex flex-row justify-center items-center md:px-20 px-10 py-20 appBgColorLight">
      <div className="flex flex-col gap-5 text-center">
        <div className="w-auto">
          <div className="relative">
            <Popover open={showSuggestions} onOpenChange={setShowSuggestions}>
              <PopoverTrigger asChild className="bg-transparent">
                <Input
                  className="absolute opacity-0 pointer-events-none"
                  onBlur={handleBlur}
                  onChange={handleChange}
                  onKeyDown={handleKeyDown}
                  placeholder="= enter formula here"
                  ref={inputRef}
                  type="text"
                  value={formula}
                />
              </PopoverTrigger>
              {suggestions.length > 0 && (
                <PopoverContent
                  className="w-full p-0"
                  onOpenAutoFocus={(e) => e.preventDefault()}
                >
                  <Command>
                    <CommandInput placeholder="Search tag..." className="h-9" />
                    <CommandList>
                      <CommandEmpty>No tags found.</CommandEmpty>
                      <CommandGroup>
                        {suggestions.map((tag) => (
                          <CommandItem
                            key={tag.id}
                            value={tag.name}
                            onSelect={(currentValue: string) => {
                              handleSelect(
                                tags.find((tag) => (tag.name = currentValue)) ??
                                  undefined
                              );
                              setShowSuggestions(false);
                            }}
                          >
                            {tag.name}
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              )}
            </Popover>

            <div
              className="border border-gray-300 rounded-md p-2 flex flex-row items-center gap-1 w-full min-h-[40px] text-base shadow-xs"
              onClick={handleClick}
              // contentEditable   {/* cannot contain chips inside */}
              // onInput={handleInput}
              ref={divRef}
            >
              <span>=</span>

              {tokens.map((token, i) =>
                STARTS_WITH_LETTER.test(token) &&
                tags.find(
                  (tag) => tag.name.trim().replace(/\s+/g, "") === token
                )?.name ? (
                  <div
                    className="text-sm rounded-xl bg-slate-200 flex flex-row items-center"
                    key={i}
                  >
                    <div className="px-2 py-1 bg-black text-white rounded-xl flex flex-row items-center gap-1">
                      <Hash size={12} className="text-white" />
                      <span>
                        {
                          tags.find(
                            (tag) =>
                              tag.name.trim().replace(/\s+/g, "") === token
                          )?.name
                        }
                      </span>
                    </div>

                    <Popover
                      open={
                        showSubSuggestions &&
                        selectedValue ===
                          tags.find(
                            (tag) =>
                              tag.name.trim().replace(/\s+/g, "") === token
                          )?.id
                      }
                      onOpenChange={setShowSubSuggestions}
                    >
                      <PopoverTrigger
                        asChild
                        className="bg-transparent"
                        onClick={() => {
                          setSelectedValue(
                            tags.find(
                              (tag) =>
                                tag.name.trim().replace(/\s+/g, "") === token
                            )?.id ?? ""
                          );
                        }}
                      >
                        <span className="py-0 px-2 text-slate-600 rounded-xl cursor-pointer">
                          {
                            tags.find(
                              (tag) =>
                                tag.name.trim().replace(/\s+/g, "") === token
                            )?.category
                          }
                        </span>
                      </PopoverTrigger>
                      {tags.find(
                        (tag) => tag.name.trim().replace(/\s+/g, "") === token
                      )?.category && (
                        <PopoverContent
                          className="w-full p-0"
                          onOpenAutoFocus={(e) => e.preventDefault()}
                        >
                          <Command>
                            <CommandInput
                              placeholder="Search category..."
                              className="h-9"
                            />
                            <CommandList>
                              <CommandEmpty>No tags found.</CommandEmpty>
                              <CommandGroup>
                                <CommandItem
                                  value={
                                    tags.find(
                                      (tag) =>
                                        tag.name.trim().replace(/\s+/g, "") ===
                                        token
                                    )?.category ?? ""
                                  }
                                  onSelect={() => {
                                    // maybe later
                                  }}
                                >
                                  {
                                    tags.find(
                                      (tag) =>
                                        tag.name.trim().replace(/\s+/g, "") ===
                                        token
                                    )?.category
                                  }
                                </CommandItem>
                              </CommandGroup>
                            </CommandList>
                          </Command>
                        </PopoverContent>
                      )}
                    </Popover>
                  </div>
                ) : (
                  <span key={i}>{token}</span>
                )
              )}

              {/* fake cursor */}
              {isFocused && <span className="animate-blink">|</span>}
            </div>

            <div className="mt-5 flex flex-row justify-center items-center gap-2">
              <Button
                className="bg-transparent! border-2! border-black text-black"
                onClick={() => {
                  setOutput(calculateFormula(tokens, tags));
                  setShowAns(true)
                }}
              >
                Calculate
              </Button>
              <Button className="bg-black text-white" onClick={clearInput}>
                Clear Input
              </Button>
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-3">
          <p className="font-semibold">Your formula: {formula}</p>

          <div className="flex flex-row gap-3 justify-center">
            <p className="font-semibold">Output:</p>
            <p className="italic">
              {!showAns ? "press enter in the input when done" : output}
            </p>
          </div>

          <div className="flex flex-row gap-3 justify-center">
            <p className="font-semibold">Hint:</p>
            <p className="italic">
              for auto suggestions from an API, type 'name...'
            </p>
          </div>
          {error && (
            <p className="text-red-600">Error fetching autocomplete values</p>
          )}
        </div>
      </div>
    </div>
  );
}

export default App;
