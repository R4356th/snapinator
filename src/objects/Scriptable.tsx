import Project from '../Project';
import { h } from '../xml';
import BlockDefinition from './BlockDefinition';
import Costume from './Costume';
import Script from './Script';
import ScriptComment from './ScriptComment';
import Sound from './Sound';
import VariableFrame from './VariableFrame';

export default class Scriptable {
    project: Project;
    name: string;
    costumes: Costume[];
    sounds: Sound[];
    costumeIndex: number;
    variables: VariableFrame;
    blocks: BlockDefinition[];
    scripts: (Script | ScriptComment)[];

    readSB2(jsonObj: any, project: Project): Scriptable {
        this.project = project;
        const costumeObjs = jsonObj.costumes;
        const soundObjs = jsonObj.sounds;
        const commentArrs = jsonObj.scriptComments;
        const scriptArrs = jsonObj.scripts;

        const blockComments = [];
        let nextBlockID = 0;

        this.name = jsonObj.objName;
        this.costumes = [];
        for (const costumeObj of costumeObjs) {
            this.costumes.push(new Costume().readSB2(costumeObj, project));
        }
        this.sounds = [];
        if (soundObjs != null) {
            for (const soundObj of soundObjs) {
                this.sounds.push(new Sound().readSB2(soundObj, project));
            }
        }
        this.costumeIndex = jsonObj.currentCostumeIndex + 1;

        this.readVariablesSB2(jsonObj, project);

        this.blocks = [];
        this.scripts = [];
        if (commentArrs != null) {
            for (const commentArr of commentArrs) {
                const blockID = commentArr[5];
                const comment = new ScriptComment().readSB2(commentArr);
                if (blockID === -1) {
                    this.scripts.push(comment);
                } else {
                    blockComments[blockID] = comment;
                }
            }
        }
        if (scriptArrs != null) {
            for (const scriptArr of scriptArrs) {
                const blockStackArr = scriptArr[2];
                const firstBlockArr = blockStackArr[0];
                const firstOp = firstBlockArr[0];
                if (firstOp === 'procDef') {
                    let blockDef: BlockDefinition;
                    [blockDef, nextBlockID] = new BlockDefinition().readSB2(
                        blockStackArr, nextBlockID, blockComments, this.variables,
                    );
                    this.blocks.push(blockDef);
                } else {
                    let script: Script;
                    [script, nextBlockID] = new Script().readSB2(
                        scriptArr, nextBlockID, blockComments, this.variables,
                    );
                    this.scripts.push(script);
                }
            }
        }

        return this;
    }

    readVariablesSB2(jsonObj: any, project: Project) {
        this.variables = new VariableFrame(project.globalVars);
    }

    readSB3(jsonObj: any, project: Project, libraryIndex: number): Scriptable {
        this.project = project;
        const costumeObjs = jsonObj.costumes;
        const soundObjs = jsonObj.sounds;
        const commentMap = jsonObj.comments;
        const blockMap = jsonObj.blocks;

        const blockComments: {[s: string]: ScriptComment} = {};

        this.name = jsonObj.name;
        this.costumes = [];
        for (const costumeObj of costumeObjs) {
            this.costumes.push(new Costume().readSB3(costumeObj, project));
        }
        this.sounds = [];
        for (const soundObj of soundObjs) {
            this.sounds.push(new Sound().readSB3(soundObj, project));
        }
        this.costumeIndex = jsonObj.currentCostume + 1;

        this.readVariablesSB3(jsonObj, project);

        this.blocks = [];
        this.scripts = [];
        for (const commentID in commentMap) {
            if (commentMap.hasOwnProperty(commentID)) {
                const commentObj = commentMap[commentID];
                const blockID = commentObj.blockId;
                const comment = new ScriptComment().readSB3(commentObj);
                if (blockID === null) {
                    this.scripts.push(comment);
                } else {
                    blockComments[blockID] = comment;
                }
            }
        }
        for (const blockID in blockMap) {
            if (blockMap.hasOwnProperty(blockID)) {
                const blockObj = blockMap[blockID];
                if (Array.isArray(blockObj) || blockObj.topLevel) {
                    if (!Array.isArray(blockObj) && blockObj.opcode === 'procedures_definition') {
                        this.blocks.push(
                            new BlockDefinition().readSB3(blockID, blockMap, blockComments, this.variables),
                        );
                    } else {
                        this.scripts.push(new Script().readSB3(blockID, blockMap, blockComments, this.variables));
                    }
                }
            }
        }

        return this;
    }

    readVariablesSB3(jsonObj: any, project: Project) {
        this.variables = new VariableFrame(project.globalVars);
    }

    costumesXML(): Element {
        return <costumes>
            <list>
                {this.costumes.map((costume) => <item>{costume.toXML()}</item>)}
            </list>
        </costumes>;
    }

    soundsXML(): Element {
        return <sounds>
            <list>
                {this.sounds.map((sound) => <item>{sound.toXML()}</item>)}
            </list>
        </sounds>;
    }

    blocksXML(): Element {
        return <blocks>
            {this.blocks.map((blockDef) => blockDef.toXML(this))}
        </blocks>;
    }

    scriptsXML(): Element {
        return <scripts>
            {this.scripts.map((scriptOrComment) => {
                if (scriptOrComment instanceof ScriptComment) {
                    const comment: ScriptComment = scriptOrComment;
                    return comment.toXML();
                }
                const script: Script = scriptOrComment;
                return script.toXML(this, this.variables);
            })}
        </scripts>;
    }
}